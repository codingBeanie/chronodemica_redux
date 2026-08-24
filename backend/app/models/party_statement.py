from sqlmodel import Field, SQLModel


class PartyStatementBase(SQLModel):
    approved: bool = True


class PartyStatement(PartyStatementBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    party_id: int = Field(foreign_key="party.id")
    statement_id: int = Field(foreign_key="statement.id")
    period_id: int = Field(foreign_key="period.id")


class PartyStatementCreate(PartyStatementBase):
    party_id: int
    statement_id: int
    period_id: int


class PartyStatementUpdate(SQLModel):
    approved: bool | None = None


class PartyStatementRead(PartyStatementBase):
    id: int
    party_id: int
    statement_id: int
    period_id: int
