from fastapi import APIRouter, Depends
from sqlmodel import Session, SQLModel

from app.db.session import get_session
from app.dependencies import get_period_or_404
from app.models.period import Period
from app.services.voting_behaviour import compute_voting_behaviour

router = APIRouter(prefix="/api/periods", tags=["voting-behaviour"])


class VotingBehaviourStatementRow(SQLModel):
    statement_id: int
    topic_id: int
    approval: int
    # Keyed by str(party_id), or "null" for the "Misc" bucket (see the service).
    party_points: dict[str, float]


class VotingBehaviourResponse(SQLModel):
    total_points: float
    # None marks the "Misc" bucket: points from statements no real party approved.
    party_ids: list[int | None]
    statements: list[VotingBehaviourStatementRow]


@router.get("/{period_id}/voting-behaviour", response_model=VotingBehaviourResponse)
def get_voting_behaviour(
    pop_id: int,
    session: Session = Depends(get_session),
    period: Period = Depends(get_period_or_404),
):
    return compute_voting_behaviour(session, period, pop_id)
