from dataclasses import dataclass

from app.models.voting_system import VotingSystem


@dataclass(frozen=True)
class VotingSystemConfig:
    threshold_percent: float
    apportionment_method: str


VOTING_SYSTEM_CONFIGS: dict[VotingSystem, VotingSystemConfig] = {
    VotingSystem.PROPORTIONAL_REPRESENTATION: VotingSystemConfig(
        threshold_percent=5.0,
        apportionment_method="sainte_lague",
    ),
}
