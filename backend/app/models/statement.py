from sqlmodel import Field, SQLModel


class StatementBase(SQLModel):
    text: str


class Statement(StatementBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id")


class StatementCreate(StatementBase):
    topic_id: int


class StatementUpdate(SQLModel):
    text: str | None = None
    topic_id: int | None = None


class StatementRead(StatementBase):
    id: int
    topic_id: int
