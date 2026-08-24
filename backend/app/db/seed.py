from sqlmodel import Session

from app.models.world import World


def create_default_world(session: Session, owner_id: int) -> World:
    world = World(name="Default World", parliament_name="Parliament", owner_id=owner_id)
    session.add(world)
    session.commit()
    session.refresh(world)
    return world
