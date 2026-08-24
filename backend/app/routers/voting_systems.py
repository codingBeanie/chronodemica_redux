from fastapi import APIRouter
from sqlmodel import SQLModel

from app.config.voting_systems import VOTING_SYSTEM_CONFIGS
from app.models.voting_system import VotingSystem

router = APIRouter(prefix="/api/voting-systems", tags=["voting-systems"])


class VotingSystemConfigRead(SQLModel):
    value: VotingSystem
    threshold_percent: float
    apportionment_method: str


@router.get("/", response_model=list[VotingSystemConfigRead])
def list_voting_systems():
    return [
        VotingSystemConfigRead(
            value=value,
            threshold_percent=config.threshold_percent,
            apportionment_method=config.apportionment_method,
        )
        for value, config in VOTING_SYSTEM_CONFIGS.items()
    ]
