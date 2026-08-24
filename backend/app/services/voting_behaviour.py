from collections import defaultdict

from sqlmodel import Session

from app.models.period import Period
from app.services.simulation import (
    compute_statement_points_for_pop,
    load_period_context,
    load_pop_statement_approvals,
)


def compute_voting_behaviour(session: Session, period: Period, pop_id: int) -> dict:
    context = load_period_context(session, period)
    approval_by_pop_statement = load_pop_statement_approvals(session, period.id, pop_id)
    statement_points = compute_statement_points_for_pop(context, pop_id, approval_by_pop_statement)

    points_by_statement: dict[int, dict[int, float]] = defaultdict(dict)
    totals_by_party: dict[int, float] = defaultdict(float)
    for (statement_id, party_id), points in statement_points.items():
        points_by_statement[statement_id][party_id] = points
        totals_by_party[party_id] += points

    party_ids = sorted(totals_by_party, key=lambda pid: totals_by_party[pid], reverse=True)
    total_points = sum(statement_points.values())

    statements = [
        {
            "statement_id": statement.id,
            "topic_id": topic_period.topic_id,
            "approval": approval_by_pop_statement.get((pop_id, statement.id), 0),
            "party_points": points_by_statement.get(statement.id, {}),
        }
        for topic_period in context.topic_periods
        for statement in context.statements_by_topic.get(topic_period.topic_id, [])
    ]

    return {"total_points": total_points, "party_ids": party_ids, "statements": statements}
