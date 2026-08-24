from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.statement import Statement, StatementCreate, StatementRead, StatementUpdate

router = APIRouter(prefix="/api/statements", tags=["statements"])


@router.get("/", response_model=list[StatementRead])
def list_statements(
    topic_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Statement)
    if topic_id is not None:
        query = query.where(Statement.topic_id == topic_id)
    return session.exec(query).all()


@router.post("/", response_model=StatementRead, status_code=201)
def create_statement(statement_in: StatementCreate, session: Session = Depends(get_session)):
    statement = Statement.model_validate(statement_in)
    session.add(statement)
    session.commit()
    session.refresh(statement)
    return statement


@router.get("/{statement_id}", response_model=StatementRead)
def get_statement(statement_id: int, session: Session = Depends(get_session)):
    statement = session.get(Statement, statement_id)
    if statement is None:
        raise HTTPException(status_code=404, detail="Statement not found")
    return statement


@router.patch("/{statement_id}", response_model=StatementRead)
def update_statement(
    statement_id: int,
    statement_in: StatementUpdate,
    session: Session = Depends(get_session),
):
    statement = session.get(Statement, statement_id)
    if statement is None:
        raise HTTPException(status_code=404, detail="Statement not found")
    for key, value in statement_in.model_dump(exclude_unset=True).items():
        setattr(statement, key, value)
    session.add(statement)
    session.commit()
    session.refresh(statement)
    return statement


@router.delete("/{statement_id}", status_code=204)
def delete_statement(statement_id: int, session: Session = Depends(get_session)):
    statement = session.get(Statement, statement_id)
    if statement is None:
        raise HTTPException(status_code=404, detail="Statement not found")
    session.delete(statement)
    session.commit()
