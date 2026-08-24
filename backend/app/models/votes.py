from sqlmodel import Field, SQLModel


class VotesBase(SQLModel):
    votes: int


class Votes(VotesBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    period_id: int = Field(foreign_key="period.id")
    # None represents votes that couldn't be attributed to any real party
    # (e.g. a statement no party approved) — a virtual "Misc" bucket rather
    # than a stored placeholder party, so it never competes for seats.
    party_id: int | None = Field(default=None, foreign_key="party.id")
    pop_id: int = Field(foreign_key="pop.id")


class VotesCreate(VotesBase):
    period_id: int
    party_id: int | None
    pop_id: int


class VotesUpdate(SQLModel):
    votes: int | None = None


class VotesRead(VotesBase):
    id: int
    period_id: int
    party_id: int | None
    pop_id: int
