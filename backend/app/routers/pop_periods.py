from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world, require_exists
from app.models.period import Period
from app.models.pop import Pop
from app.models.pop_period import PopPeriod, PopPeriodCreate, PopPeriodRead, PopPeriodUpdate
from app.models.world import World

router = APIRouter(prefix="/api/pop-periods", tags=["pop-periods"])


@router.get("/", response_model=list[PopPeriodRead])
def list_pop_periods(
    period_id: int | None = Query(default=None),
    pop_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(PopPeriod)
    if period_id is not None:
        query = query.where(PopPeriod.period_id == period_id)
    if pop_id is not None:
        query = query.where(PopPeriod.pop_id == pop_id)
    return session.exec(query).all()


@router.post("/", response_model=PopPeriodRead, status_code=201)
def create_pop_period(
    pop_period_in: PopPeriodCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    require_exists(session, Pop, pop_period_in.pop_id, "Pop", world)
    require_exists(session, Period, pop_period_in.period_id, "Period", world)
    pop_period = PopPeriod.model_validate(pop_period_in)
    session.add(pop_period)
    session.commit()
    session.refresh(pop_period)
    return pop_period


@router.get("/{pop_period_id}", response_model=PopPeriodRead)
def get_pop_period(pop_period_id: int, session: Session = Depends(get_session)):
    pop_period = session.get(PopPeriod, pop_period_id)
    if pop_period is None:
        raise HTTPException(status_code=404, detail="PopPeriod not found")
    return pop_period


@router.patch("/{pop_period_id}", response_model=PopPeriodRead)
def update_pop_period(
    pop_period_id: int,
    pop_period_in: PopPeriodUpdate,
    session: Session = Depends(get_session),
):
    pop_period = session.get(PopPeriod, pop_period_id)
    if pop_period is None:
        raise HTTPException(status_code=404, detail="PopPeriod not found")
    for key, value in pop_period_in.model_dump(exclude_unset=True).items():
        setattr(pop_period, key, value)
    session.add(pop_period)
    session.commit()
    session.refresh(pop_period)
    return pop_period


@router.delete("/{pop_period_id}", status_code=204)
def delete_pop_period(pop_period_id: int, session: Session = Depends(get_session)):
    pop_period = session.get(PopPeriod, pop_period_id)
    if pop_period is None:
        raise HTTPException(status_code=404, detail="PopPeriod not found")
    session.delete(pop_period)
    session.commit()
