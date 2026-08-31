from itertools import combinations

from sqlmodel import Session, select

from app.models.parliament_period import ParliamentPeriod
from app.models.party import Party


def compute_coalitions(session: Session, period_id: int) -> dict:
    # The virtual "Misc" bucket (party_id None) can hold seats like a real party
    # (see Period.misc_excluded_from_parliament), but it never acts as a
    # coalition partner — it's excluded here regardless of that flag.
    entries = session.exec(
        select(ParliamentPeriod).where(
            ParliamentPeriod.period_id == period_id,
            ParliamentPeriod.party_id.is_not(None),
        )
    ).all()
    if not entries:
        return {"total_seats": 0, "majority_threshold": 0, "coalitions": []}

    seats_by_party = {entry.party_id: entry.seats for entry in entries}
    party_ids = list(seats_by_party.keys())

    parties = session.exec(select(Party).where(Party.id.in_(party_ids))).all()
    orientation_by_party = {party.id: party.seat_orientation for party in parties}

    total_seats = sum(seats_by_party.values())
    majority_threshold = total_seats // 2 + 1

    minimal_coalitions: list[dict] = []
    for size in range(1, len(party_ids) + 1):
        for combo in combinations(party_ids, size):
            combo_seats = sum(seats_by_party[pid] for pid in combo)
            if combo_seats < majority_threshold:
                continue
            is_minimal = all(
                combo_seats - seats_by_party[pid] < majority_threshold for pid in combo
            )
            if not is_minimal:
                continue

            orientations = [orientation_by_party.get(pid, 50) for pid in combo]
            spread = max(orientations) - min(orientations)
            minimal_coalitions.append(
                {"party_ids": list(combo), "total_seats": combo_seats, "spread": spread}
            )

    minimal_coalitions.sort(key=lambda c: (c["spread"], len(c["party_ids"]), -c["total_seats"]))

    return {
        "total_seats": total_seats,
        "majority_threshold": majority_threshold,
        "coalitions": minimal_coalitions,
    }
