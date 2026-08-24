from sqlmodel import Field, SQLModel


class PopPeriodBase(SQLModel):
    population: int = Field(ge=0)
    turnout: float = Field(ge=0, le=1)
    eligibility: float = Field(ge=0, le=1)


class PopPeriod(PopPeriodBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    pop_id: int = Field(foreign_key="pop.id")
    period_id: int = Field(foreign_key="period.id")


class PopPeriodCreate(PopPeriodBase):
    pop_id: int
    period_id: int


class PopPeriodUpdate(SQLModel):
    population: int | None = Field(default=None, ge=0)
    turnout: float | None = Field(default=None, ge=0, le=1)
    eligibility: float | None = Field(default=None, ge=0, le=1)


class PopPeriodRead(PopPeriodBase):
    id: int
    pop_id: int
    period_id: int
