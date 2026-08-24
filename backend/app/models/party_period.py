from sqlmodel import Field, SQLModel


class PartyPeriodBase(SQLModel):
    popularity: int = Field(ge=1, le=20)


class PartyPeriod(PartyPeriodBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    party_id: int = Field(foreign_key="party.id")
    period_id: int = Field(foreign_key="period.id")


class PartyPeriodCreate(PartyPeriodBase):
    party_id: int
    period_id: int


class PartyPeriodUpdate(SQLModel):
    popularity: int | None = Field(default=None, ge=1, le=20)


class PartyPeriodRead(PartyPeriodBase):
    id: int
    party_id: int
    period_id: int
