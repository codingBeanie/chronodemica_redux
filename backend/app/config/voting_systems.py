from dataclasses import dataclass
from enum import Enum

from app.models.voting_system import VotingSystem


class ThresholdType(str, Enum):
    # Excludes a party if its national vote share falls under `threshold_percent`.
    PERCENT_OF_VOTE = "percent_of_vote"
    # No percentage cutoff: excludes a party only if its ideal, pre-rounding
    # seat share (vote share * total seats) doesn't even reach 1.0 — i.e. it
    # wouldn't mathematically earn a single seat even before apportionment
    # rounding. `threshold_percent` is unused for this type.
    NATURAL_SEAT_QUOTA = "natural_seat_quota"


@dataclass(frozen=True)
class VotingSystemConfig:
    threshold_type: ThresholdType
    apportionment_method: str
    threshold_percent: float = 0.0


VOTING_SYSTEM_CONFIGS: dict[VotingSystem, VotingSystemConfig] = {
    VotingSystem.PROPORTIONAL_REPRESENTATION: VotingSystemConfig(
        threshold_type=ThresholdType.PERCENT_OF_VOTE,
        threshold_percent=5.0,
        apportionment_method="sainte_lague",
    ),
    VotingSystem.PROPORTIONAL_NATURAL_THRESHOLD: VotingSystemConfig(
        threshold_type=ThresholdType.NATURAL_SEAT_QUOTA,
        apportionment_method="sainte_lague",
    ),
}
