from sqlmodel import Field, SQLModel


class PopStatementBase(SQLModel):
    approval: int = Field(ge=0, le=100)


class PopStatement(PopStatementBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    pop_id: int = Field(foreign_key="pop.id")
    statement_id: int = Field(foreign_key="statement.id")
    period_id: int = Field(foreign_key="period.id")


class PopStatementCreate(PopStatementBase):
    pop_id: int
    statement_id: int
    period_id: int


class PopStatementUpdate(SQLModel):
    approval: int | None = Field(default=None, ge=0, le=100)


class PopStatementRead(PopStatementBase):
    id: int
    pop_id: int
    statement_id: int
    period_id: int
