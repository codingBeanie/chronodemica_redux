from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import require_auth
from app.models.user import User
from app.models.world import World, WorldBase
from app.services.world_reset import delete_all_data

router = APIRouter(prefix="/api/worlds", tags=["worlds"])


@router.get("/", response_model=list[World])
def list_worlds(session: Session = Depends(get_session), user: User = Depends(require_auth)):
    return session.exec(select(World).where(World.owner_id == user.id)).all()


@router.post("/", response_model=World, status_code=201)
def create_world(
    world_in: WorldBase,
    session: Session = Depends(get_session),
    user: User = Depends(require_auth),
):
    world = World.model_validate(world_in, update={"owner_id": user.id})
    session.add(world)
    session.commit()
    session.refresh(world)
    return world


def _get_owned_world(session: Session, world_id: int, user: User) -> World:
    world = session.get(World, world_id)
    if world is None or world.owner_id != user.id:
        raise HTTPException(status_code=404, detail="World not found")
    return world


@router.patch("/{world_id}", response_model=World)
def update_world(
    world_id: int,
    world_in: WorldBase,
    session: Session = Depends(get_session),
    user: User = Depends(require_auth),
):
    world = _get_owned_world(session, world_id, user)
    world.name = world_in.name
    world.parliament_name = world_in.parliament_name
    session.add(world)
    session.commit()
    session.refresh(world)
    return world


@router.delete("/{world_id}", status_code=204)
def delete_world(
    world_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(require_auth),
):
    world = _get_owned_world(session, world_id, user)
    delete_all_data(session, world.id, commit=False)
    session.delete(world)
    session.commit()
