from datetime import date

from sqlmodel import Field, SQLModel

from app.models.voting_system import VotingSystem


class PeriodBase(SQLModel):
    voting_date: date
    start_date: date
    end_date: date
    voting_system: VotingSystem
    seats: int = Field(ge=0)
    total_population: int = Field(ge=0)
    # False (default): the "Misc" vote bucket competes for parliamentary seats
    # like a real party. True: Misc still shows up in results, but never wins
    # seats. Coalitions ignore Misc either way (see compute_coalitions).
    misc_excluded_from_parliament: bool = False


class Period(PeriodBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    world_id: int = Field(foreign_key="world.id")


class PeriodCreate(PeriodBase):
    pass


class PeriodUpdate(SQLModel):
    voting_date: date | None = None
    start_date: date | None = None
    end_date: date | None = None
    voting_system: VotingSystem | None = None
    seats: int | None = None
    total_population: int | None = None
    misc_excluded_from_parliament: bool | None = None


class PeriodRead(PeriodBase):
    id: int
    world_id: int
