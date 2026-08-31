from sqlmodel import Field, SQLModel


class ParliamentPeriodBase(SQLModel):
    seats: int
    in_government: bool = False


class ParliamentPeriod(ParliamentPeriodBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    period_id: int = Field(foreign_key="period.id")
    # None represents the virtual "Misc" bucket winning seats like a real party
    # (see Period.misc_excluded_from_parliament) rather than a stored party.
    party_id: int | None = Field(default=None, foreign_key="party.id")


class ParliamentPeriodGovernmentUpdate(SQLModel):
    in_government: bool


class ParliamentPeriodRead(ParliamentPeriodBase):
    id: int
    period_id: int
    party_id: int | None
