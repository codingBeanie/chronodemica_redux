from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.dependencies import get_current_world, require_exists
from app.models.period import Period
from app.models.pop import Pop
from app.models.pop_statement import (
    PopStatement,
    PopStatementCreate,
    PopStatementRead,
    PopStatementUpdate,
)
from app.models.statement import Statement
from app.models.world import World

router = APIRouter(prefix="/api/pop-statements", tags=["pop-statements"])


@router.get("/", response_model=list[PopStatementRead])
def list_pop_statements(
    period_id: int | None = Query(default=None),
    pop_id: int | None = Query(default=None),
    statement_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(PopStatement)
    if period_id is not None:
        query = query.where(PopStatement.period_id == period_id)
    if pop_id is not None:
        query = query.where(PopStatement.pop_id == pop_id)
    if statement_id is not None:
        query = query.where(PopStatement.statement_id == statement_id)
    return session.exec(query).all()


@router.post("/", response_model=PopStatementRead, status_code=201)
def create_pop_statement(
    pop_statement_in: PopStatementCreate,
    session: Session = Depends(get_session),
    world: World = Depends(get_current_world),
):
    require_exists(session, Pop, pop_statement_in.pop_id, "Pop", world)
    require_exists(session, Statement, pop_statement_in.statement_id, "Statement")
    require_exists(session, Period, pop_statement_in.period_id, "Period", world)
    pop_statement = PopStatement.model_validate(pop_statement_in)
    session.add(pop_statement)
    session.commit()
    session.refresh(pop_statement)
    return pop_statement


@router.get("/{pop_statement_id}", response_model=PopStatementRead)
def get_pop_statement(pop_statement_id: int, session: Session = Depends(get_session)):
    pop_statement = session.get(PopStatement, pop_statement_id)
    if pop_statement is None:
        raise HTTPException(status_code=404, detail="PopStatement not found")
    return pop_statement


@router.patch("/{pop_statement_id}", response_model=PopStatementRead)
def update_pop_statement(
    pop_statement_id: int,
    pop_statement_in: PopStatementUpdate,
    session: Session = Depends(get_session),
):
    pop_statement = session.get(PopStatement, pop_statement_id)
    if pop_statement is None:
        raise HTTPException(status_code=404, detail="PopStatement not found")
    for key, value in pop_statement_in.model_dump(exclude_unset=True).items():
        setattr(pop_statement, key, value)
    session.add(pop_statement)
    session.commit()
    session.refresh(pop_statement)
    return pop_statement


@router.delete("/{pop_statement_id}", status_code=204)
def delete_pop_statement(pop_statement_id: int, session: Session = Depends(get_session)):
    pop_statement = session.get(PopStatement, pop_statement_id)
    if pop_statement is None:
        raise HTTPException(status_code=404, detail="PopStatement not found")
    session.delete(pop_statement)
    session.commit()
