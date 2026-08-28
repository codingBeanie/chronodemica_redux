from datetime import date

from sqlmodel import Session, select

from app.models.party import Party
from app.models.party_period import PartyPeriod
from app.models.period import Period

DEFAULT_POPULARITY = 10


def is_party_active_at(party: Party, voting_date: date) -> bool:
    """Whether `party` had already been founded and hadn't yet dissolved as of `voting_date`."""
    year = voting_date.year
    return (party.founded is None or year >= party.founded) and (
        party.dissolved is None or year <= party.dissolved
    )


def sync_party_periods(session: Session, world_id: int) -> None:
    """Ensures every party that's founded and not yet dissolved as of a period's
    voting date has a PartyPeriod row for it, so a party never needs to be
    manually added to a period — only its popularity edited. A newly added row
    copies popularity from that same party's most recent earlier period, if
    any, else DEFAULT_POPULARITY. Never deletes rows: a party that becomes
    ineligible for a period after its founded/dissolved dates are edited keeps
    its existing entry there, removable by hand if unwanted.
    """
    parties = session.exec(select(Party).where(Party.world_id == world_id)).all()
    periods = session.exec(select(Period).where(Period.world_id == world_id)).all()
    if not parties or not periods:
        return
    periods = sorted(periods, key=lambda period: period.voting_date)

    existing_rows = session.exec(
        select(PartyPeriod).where(PartyPeriod.period_id.in_([period.id for period in periods]))
    ).all()
    rows_by_period: dict[int, dict[int, PartyPeriod]] = {}
    for row in existing_rows:
        rows_by_period.setdefault(row.period_id, {})[row.party_id] = row

    for party in parties:
        previous_popularity: int | None = None
        for period in periods:
            row = rows_by_period.get(period.id, {}).get(party.id)
            if row is not None:
                previous_popularity = row.popularity
                continue
            if not is_party_active_at(party, period.voting_date):
                continue
            popularity = previous_popularity if previous_popularity is not None else DEFAULT_POPULARITY
            session.add(PartyPeriod(party_id=party.id, period_id=period.id, popularity=popularity))
            previous_popularity = popularity
    session.flush()
