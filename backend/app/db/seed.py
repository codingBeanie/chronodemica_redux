from sqlmodel import Session, select

from app.models.party import Party
from app.models.world import World

MISCELLANEOUS_PARTY_NAME = "Miscellaneous"


def create_default_world(session: Session, owner_id: int) -> World:
    world = World(name="Default World", parliament_name="Parliament", owner_id=owner_id)
    session.add(world)
    session.commit()
    session.refresh(world)
    return world


def ensure_miscellaneous_party(session: Session, world_id: int) -> Party:
    party = session.exec(
        select(Party).where(Party.world_id == world_id, Party.name == MISCELLANEOUS_PARTY_NAME)
    ).first()
    if party is None:
        party = Party(
            world_id=world_id,
            abbreviation="MISC",
            name=MISCELLANEOUS_PARTY_NAME,
            color_bg="#adb5bd",
            color_text="#000000",
        )
        session.add(party)
        session.commit()
        session.refresh(party)
    return party
