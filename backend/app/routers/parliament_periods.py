from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.parliament_period import (
    ParliamentPeriod,
    ParliamentPeriodGovernmentUpdate,
    ParliamentPeriodRead,
)

router = APIRouter(prefix="/api/parliament-periods", tags=["parliament-periods"])


@router.get("/", response_model=list[ParliamentPeriodRead])
def list_parliament_periods(
    period_id: int | None = Query(default=None),
    party_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(ParliamentPeriod)
    if period_id is not None:
        query = query.where(ParliamentPeriod.period_id == period_id)
    if party_id is not None:
        query = query.where(ParliamentPeriod.party_id == party_id)
    return session.exec(query).all()


@router.get("/{parliament_period_id}", response_model=ParliamentPeriodRead)
def get_parliament_period(parliament_period_id: int, session: Session = Depends(get_session)):
    parliament_period = session.get(ParliamentPeriod, parliament_period_id)
    if parliament_period is None:
        raise HTTPException(status_code=404, detail="ParliamentPeriod not found")
    return parliament_period


@router.patch("/{parliament_period_id}", response_model=ParliamentPeriodRead)
def update_parliament_period_government(
    parliament_period_id: int,
    update_in: ParliamentPeriodGovernmentUpdate,
    session: Session = Depends(get_session),
):
    parliament_period = session.get(ParliamentPeriod, parliament_period_id)
    if parliament_period is None:
        raise HTTPException(status_code=404, detail="ParliamentPeriod not found")
    parliament_period.in_government = update_in.in_government
    session.add(parliament_period)
    session.commit()
    session.refresh(parliament_period)
    return parliament_period
