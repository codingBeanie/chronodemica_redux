from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world, require_exists
from app.models.party import Party
from app.models.party_statement import (
    PartyStatement,
    PartyStatementCreate,
    PartyStatementRead,
    PartyStatementUpdate,
)
from app.models.period import Period
from app.models.statement import Statement
from app.models.world import World

router = APIRouter(prefix="/api/party-statements", tags=["party-statements"])


@router.get("/", response_model=list[PartyStatementRead])
def list_party_statements(
    period_id: int | None = Query(default=None),
    party_id: int | None = Query(default=None),
    statement_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(PartyStatement)
    if period_id is not None:
        query = query.where(PartyStatement.period_id == period_id)
    if party_id is not None:
        query = query.where(PartyStatement.party_id == party_id)
    if statement_id is not None:
        query = query.where(PartyStatement.statement_id == statement_id)
    return session.exec(query).all()


@router.post("/", response_model=PartyStatementRead, status_code=201)
def create_party_statement(
    party_statement_in: PartyStatementCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    require_exists(session, Party, party_statement_in.party_id, "Party", world)
    require_exists(session, Statement, party_statement_in.statement_id, "Statement")
    require_exists(session, Period, party_statement_in.period_id, "Period", world)
    party_statement = PartyStatement.model_validate(party_statement_in)
    session.add(party_statement)
    session.commit()
    session.refresh(party_statement)
    return party_statement


@router.get("/{party_statement_id}", response_model=PartyStatementRead)
def get_party_statement(party_statement_id: int, session: Session = Depends(get_session)):
    party_statement = session.get(PartyStatement, party_statement_id)
    if party_statement is None:
        raise HTTPException(status_code=404, detail="PartyStatement not found")
    return party_statement


@router.patch("/{party_statement_id}", response_model=PartyStatementRead)
def update_party_statement(
    party_statement_id: int,
    party_statement_in: PartyStatementUpdate,
    session: Session = Depends(get_session),
):
    party_statement = session.get(PartyStatement, party_statement_id)
    if party_statement is None:
        raise HTTPException(status_code=404, detail="PartyStatement not found")
    for key, value in party_statement_in.model_dump(exclude_unset=True).items():
        setattr(party_statement, key, value)
    session.add(party_statement)
    session.commit()
    session.refresh(party_statement)
    return party_statement


@router.delete("/{party_statement_id}", status_code=204)
def delete_party_statement(party_statement_id: int, session: Session = Depends(get_session)):
    party_statement = session.get(PartyStatement, party_statement_id)
    if party_statement is None:
        raise HTTPException(status_code=404, detail="PartyStatement not found")
    session.delete(party_statement)
    session.commit()
