from sqlmodel import Field, SQLModel


class VotesBase(SQLModel):
    votes: int


class Votes(VotesBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    period_id: int = Field(foreign_key="period.id")
    party_id: int = Field(foreign_key="party.id")
    pop_id: int = Field(foreign_key="pop.id")


class VotesCreate(VotesBase):
    period_id: int
    party_id: int
    pop_id: int


class VotesUpdate(SQLModel):
    votes: int | None = None


class VotesRead(VotesBase):
    id: int
    period_id: int
    party_id: int
    pop_id: int
