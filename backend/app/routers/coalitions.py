from fastapi import APIRouter, Depends
from sqlmodel import Session, SQLModel

from app.db.session import get_session
from app.dependencies import get_period_or_404
from app.models.period import Period
from app.services.coalitions import compute_coalitions

router = APIRouter(prefix="/api/periods", tags=["coalitions"])


class CoalitionRead(SQLModel):
    party_ids: list[int]
    total_seats: int
    spread: int


class CoalitionsResponse(SQLModel):
    total_seats: int
    majority_threshold: int
    coalitions: list[CoalitionRead]


@router.get("/{period_id}/coalitions", response_model=CoalitionsResponse)
def get_coalitions(
    period_id: int,
    session: Session = Depends(get_session),
    _period: Period = Depends(get_period_or_404),
):
    return compute_coalitions(session, period_id)
