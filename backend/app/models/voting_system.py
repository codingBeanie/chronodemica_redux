from enum import Enum


class VotingSystem(str, Enum):
    PROPORTIONAL_REPRESENTATION = "proportional_representation"
    PROPORTIONAL_NATURAL_THRESHOLD = "proportional_natural_threshold"
