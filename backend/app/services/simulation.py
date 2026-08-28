import math
from collections import defaultdict
from dataclasses import dataclass

from sqlmodel import Session, select

from app.config.voting_systems import VOTING_SYSTEM_CONFIGS
from app.models.parliament_period import ParliamentPeriod
from app.models.party_period import PartyPeriod
from app.models.party_statement import PartyStatement
from app.models.period import Period
from app.models.pop_period import PopPeriod
from app.models.pop_statement import PopStatement
from app.models.statement import Statement
from app.models.topic_period import TopicPeriod
from app.models.votes import Votes


def largest_remainder_round[K](shares: dict[K, float], total: int) -> dict[K, int]:
    floors = {k: math.floor(v) for k, v in shares.items()}
    remainder_total = total - sum(floors.values())
    order = sorted(shares.keys(), key=lambda k: shares[k] - floors[k], reverse=True)
    result = dict(floors)
    for k in order[:remainder_total]:
        result[k] += 1
    return result


def sainte_lague_apportion[K](votes: dict[K, int], seats: int) -> dict[K, int]:
    allocation = dict.fromkeys(votes, 0)
    for _ in range(seats):
        best_key = max(votes, key=lambda k: votes[k] / (2 * allocation[k] + 1))
        allocation[best_key] += 1
    return allocation


@dataclass
class PeriodContext:
    topic_periods: list[TopicPeriod]
    statements_by_topic: dict[int, list[Statement]]
    approving_parties_by_statement: dict[int, list[int]]
    popularity_by_party: dict[int, int]


def load_period_context(session: Session, period: Period) -> PeriodContext:
    topic_periods = session.exec(select(TopicPeriod).where(TopicPeriod.period_id == period.id)).all()
    party_periods = session.exec(select(PartyPeriod).where(PartyPeriod.period_id == period.id)).all()
    popularity_by_party = {pp.party_id: pp.popularity for pp in party_periods}

    topic_ids = [topic_period.topic_id for topic_period in topic_periods]
    statements_by_topic: dict[int, list[Statement]] = defaultdict(list)
    if topic_ids:
        for statement in session.exec(select(Statement).where(Statement.topic_id.in_(topic_ids))).all():
            statements_by_topic[statement.topic_id].append(statement)

    approving_parties_by_statement: dict[int, list[int]] = defaultdict(list)
    party_statements = session.exec(
        select(PartyStatement).where(
            PartyStatement.period_id == period.id,
            PartyStatement.approved == True,
        )
    ).all()
    for ps in party_statements:
        approving_parties_by_statement[ps.statement_id].append(ps.party_id)

    return PeriodContext(
        topic_periods=topic_periods,
        statements_by_topic=statements_by_topic,
        approving_parties_by_statement=approving_parties_by_statement,
        popularity_by_party=popularity_by_party,
    )


def load_pop_statement_approvals(
    session: Session, period_id: int, pop_id: int | None = None
) -> dict[tuple[int, int], int]:
    query = select(PopStatement).where(PopStatement.period_id == period_id)
    if pop_id is not None:
        query = query.where(PopStatement.pop_id == pop_id)
    approval_by_pop_statement: dict[tuple[int, int], int] = {}
    for pop_statement in session.exec(query).all():
        approval_by_pop_statement[(pop_statement.pop_id, pop_statement.statement_id)] = (
            pop_statement.approval
        )
    return approval_by_pop_statement


def compute_statement_points_for_pop(
    context: PeriodContext,
    pop_id: int,
    approval_by_pop_statement: dict[tuple[int, int], int],
) -> dict[tuple[int, int | None], float]:
    """Points earned by each party from each statement, for a single pop. Not yet
    scaled to actual vote counts and not yet aggregated across statements.

    A party id of None is the "Misc" bucket: points from statements no real
    party approved, which never competes for parliamentary seats.
    """
    points_by_statement_party: dict[tuple[int, int | None], float] = defaultdict(float)

    for topic_period in context.topic_periods:
        total_points = 10 * topic_period.importance
        for statement in context.statements_by_topic.get(topic_period.topic_id, []):
            approval = approval_by_pop_statement.get((pop_id, statement.id))
            if not approval:
                continue
            points = total_points * approval / 100
            if points <= 0:
                continue

            approving_party_ids = context.approving_parties_by_statement.get(statement.id, [])
            if not approving_party_ids:
                points_by_statement_party[(statement.id, None)] += points
                continue

            popularities = {pid: context.popularity_by_party.get(pid, 0) for pid in approving_party_ids}
            total_popularity = sum(popularities.values())
            if total_popularity <= 0:
                share = points / len(approving_party_ids)
                for pid in approving_party_ids:
                    points_by_statement_party[(statement.id, pid)] += share
            else:
                for pid in approving_party_ids:
                    points_by_statement_party[(statement.id, pid)] += (
                        points * popularities[pid] / total_popularity
                    )

    return points_by_statement_party


def _delete_simulation_rows(session: Session, period_id: int) -> None:
    for row in session.exec(select(Votes).where(Votes.period_id == period_id)).all():
        session.delete(row)
    for row in session.exec(
        select(ParliamentPeriod).where(ParliamentPeriod.period_id == period_id)
    ).all():
        session.delete(row)


def clear_simulation(session: Session, period_id: int) -> None:
    _delete_simulation_rows(session, period_id)
    session.commit()


def run_simulation(session: Session, period: Period) -> None:
    # Clear and recompute in a single transaction (one final commit below) so a
    # failure partway through leaves the previous simulation results intact
    # instead of committing an empty/cleared state.
    _delete_simulation_rows(session, period.id)

    context = load_period_context(session, period)

    pop_periods = session.exec(select(PopPeriod).where(PopPeriod.period_id == period.id)).all()
    approval_by_pop_statement = load_pop_statement_approvals(session, period.id)

    national_totals: dict[int | None, int] = defaultdict(int)

    for pop_period in pop_periods:
        votes_cast = period.total_population * pop_period.share / 100 * pop_period.turnout

        statement_points = compute_statement_points_for_pop(
            context, pop_period.pop_id, approval_by_pop_statement
        )
        pop_scores: dict[int | None, float] = defaultdict(float)
        for (_statement_id, party_id), points in statement_points.items():
            pop_scores[party_id] += points

        total_score = sum(pop_scores.values())
        total_votes_int = round(votes_cast)
        if total_score <= 0 or total_votes_int <= 0:
            continue

        raw_shares = {pid: total_votes_int * score / total_score for pid, score in pop_scores.items()}
        party_votes = largest_remainder_round(raw_shares, total_votes_int)

        for party_id, vote_count in party_votes.items():
            if vote_count <= 0:
                continue
            session.add(
                Votes(period_id=period.id, party_id=party_id, pop_id=pop_period.pop_id, votes=vote_count)
            )
            national_totals[party_id] += vote_count

    total_national_votes = sum(national_totals.values())
    if total_national_votes > 0:
        config = VOTING_SYSTEM_CONFIGS[period.voting_system]
        threshold = config.threshold_percent / 100 * total_national_votes
        eligible = {
            pid: v for pid, v in national_totals.items() if v >= threshold and pid is not None
        }
        if eligible:
            allocation = sainte_lague_apportion(eligible, period.seats)
            for party_id, seats in allocation.items():
                if seats > 0:
                    session.add(
                        ParliamentPeriod(
                            period_id=period.id, party_id=party_id, seats=seats, in_government=False
                        )
                    )

    session.commit()
