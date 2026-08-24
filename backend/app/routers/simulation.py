from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.session import get_session
from app.dependencies import get_period_or_404
from app.models.period import Period
from app.services.simulation import clear_simulation, run_simulation

router = APIRouter(prefix="/api/periods", tags=["simulation"])


@router.post("/{period_id}/simulate", status_code=200)
def simulate_period(
    session: Session = Depends(get_session), period: Period = Depends(get_period_or_404)
) -> dict[str, str]:
    run_simulation(session, period)
    return {"status": "completed"}


@router.delete("/{period_id}/simulation", status_code=204)
def delete_simulation(
    period_id: int,
    session: Session = Depends(get_session),
    _period: Period = Depends(get_period_or_404),
):
    clear_simulation(session, period_id)
