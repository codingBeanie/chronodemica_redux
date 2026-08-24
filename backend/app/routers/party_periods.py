from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world, require_exists
from app.models.party import Party
from app.models.party_period import (
    PartyPeriod,
    PartyPeriodCreate,
    PartyPeriodRead,
    PartyPeriodUpdate,
)
from app.models.period import Period
from app.models.world import World

router = APIRouter(prefix="/api/party-periods", tags=["party-periods"])


@router.get("/", response_model=list[PartyPeriodRead])
def list_party_periods(
    period_id: int | None = Query(default=None),
    party_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(PartyPeriod)
    if period_id is not None:
        query = query.where(PartyPeriod.period_id == period_id)
    if party_id is not None:
        query = query.where(PartyPeriod.party_id == party_id)
    return session.exec(query).all()


@router.post("/", response_model=PartyPeriodRead, status_code=201)
def create_party_period(
    party_period_in: PartyPeriodCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    require_exists(session, Party, party_period_in.party_id, "Party", world)
    require_exists(session, Period, party_period_in.period_id, "Period", world)
    party_period = PartyPeriod.model_validate(party_period_in)
    session.add(party_period)
    session.commit()
    session.refresh(party_period)
    return party_period


@router.get("/{party_period_id}", response_model=PartyPeriodRead)
def get_party_period(party_period_id: int, session: Session = Depends(get_session)):
    party_period = session.get(PartyPeriod, party_period_id)
    if party_period is None:
        raise HTTPException(status_code=404, detail="PartyPeriod not found")
    return party_period


@router.patch("/{party_period_id}", response_model=PartyPeriodRead)
def update_party_period(
    party_period_id: int,
    party_period_in: PartyPeriodUpdate,
    session: Session = Depends(get_session),
):
    party_period = session.get(PartyPeriod, party_period_id)
    if party_period is None:
        raise HTTPException(status_code=404, detail="PartyPeriod not found")
    for key, value in party_period_in.model_dump(exclude_unset=True).items():
        setattr(party_period, key, value)
    session.add(party_period)
    session.commit()
    session.refresh(party_period)
    return party_period


@router.delete("/{party_period_id}", status_code=204)
def delete_party_period(party_period_id: int, session: Session = Depends(get_session)):
    party_period = session.get(PartyPeriod, party_period_id)
    if party_period is None:
        raise HTTPException(status_code=404, detail="PartyPeriod not found")
    session.delete(party_period)
    session.commit()
