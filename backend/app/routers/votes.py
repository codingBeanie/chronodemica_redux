from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db.session import get_session
from app.models.votes import Votes, VotesRead

router = APIRouter(prefix="/api/votes", tags=["votes"])


@router.get("/", response_model=list[VotesRead])
def list_votes(
    period_id: int | None = Query(default=None),
    party_id: int | None = Query(default=None),
    pop_id: int | None = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(Votes)
    if period_id is not None:
        query = query.where(Votes.period_id == period_id)
    if party_id is not None:
        query = query.where(Votes.party_id == party_id)
    if pop_id is not None:
        query = query.where(Votes.pop_id == pop_id)
    return session.exec(query).all()


@router.get("/{votes_id}", response_model=VotesRead)
def get_votes(votes_id: int, session: Session = Depends(get_session)):
    votes = session.get(Votes, votes_id)
    if votes is None:
        raise HTTPException(status_code=404, detail="Votes not found")
    return votes
