from fastapi import Depends, Header, HTTPException
from sqlmodel import Session

from app.core.config import settings
from app.db.session import get_session
from app.models.period import Period
from app.models.user import User
from app.models.world import World
from app.services.auth import get_or_create_dev_user, get_user_by_token


def get_bearer_token(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return authorization[len("bearer ") :].strip()


def require_auth(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_session),
) -> User:
    # Local-dev-only escape hatch (see Settings.auth_disabled) — skips token
    # verification entirely rather than routing through get_bearer_token, which would
    # otherwise reject the request for having no Authorization header before this
    # function's body ever runs.
    if settings.auth_disabled:
        return get_or_create_dev_user(session)
    token = get_bearer_token(authorization)
    user = get_user_by_token(session, token)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    return user


def get_current_world(
    x_world_id: int | None = Header(default=None, alias="X-World-Id"),
    session: Session = Depends(get_session),
    user: User = Depends(require_auth),
) -> World:
    if x_world_id is None:
        raise HTTPException(status_code=400, detail="X-World-Id header is required")
    world = session.get(World, x_world_id)
    if world is None or world.owner_id != user.id:
        raise HTTPException(status_code=404, detail="World not found")
    return world


def get_period_or_404(
    period_id: int,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
) -> Period:
    period = session.get(Period, period_id)
    if period is None or period.world_id != world.id:
        raise HTTPException(status_code=404, detail="Period not found")
    return period


def require_exists(session: Session, model: type, id_: int, label: str, world: World | None = None) -> None:
    row = session.get(model, id_)
    if row is None:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    if world is not None and hasattr(row, "world_id") and row.world_id != world.id:
        raise HTTPException(status_code=404, detail=f"{label} not found")
