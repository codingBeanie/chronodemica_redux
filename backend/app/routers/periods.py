from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world
from app.models.period import Period, PeriodCreate, PeriodRead, PeriodUpdate
from app.models.world import World

router = APIRouter(prefix="/api/periods", tags=["periods"])


@router.get("/", response_model=list[PeriodRead])
def list_periods(
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    return session.exec(select(Period).where(Period.world_id == world.id)).all()


@router.post("/", response_model=PeriodRead, status_code=201)
def create_period(
    period_in: PeriodCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    period = Period.model_validate(period_in, update={"world_id": world.id})
    session.add(period)
    session.commit()
    session.refresh(period)
    return period


@router.get("/{period_id}", response_model=PeriodRead)
def get_period(period_id: int, session: Session = Depends(get_session)):
    period = session.get(Period, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    return period


@router.patch("/{period_id}", response_model=PeriodRead)
def update_period(period_id: int, period_in: PeriodUpdate, session: Session = Depends(get_session)):
    period = session.get(Period, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    for key, value in period_in.model_dump(exclude_unset=True).items():
        setattr(period, key, value)
    session.add(period)
    session.commit()
    session.refresh(period)
    return period


@router.delete("/{period_id}", status_code=204)
def delete_period(period_id: int, session: Session = Depends(get_session)):
    period = session.get(Period, period_id)
    if period is None:
        raise HTTPException(status_code=404, detail="Period not found")
    session.delete(period)
    session.commit()
