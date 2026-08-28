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


class PeriodRead(PeriodBase):
    id: int
    world_id: int
