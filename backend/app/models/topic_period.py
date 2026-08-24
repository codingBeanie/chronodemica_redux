from sqlmodel import Field, SQLModel


class TopicPeriodBase(SQLModel):
    importance: int = Field(ge=1, le=20)


class TopicPeriod(TopicPeriodBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id")
    period_id: int = Field(foreign_key="period.id")


class TopicPeriodCreate(TopicPeriodBase):
    topic_id: int
    period_id: int


class TopicPeriodUpdate(SQLModel):
    importance: int | None = Field(default=None, ge=1, le=20)


class TopicPeriodRead(TopicPeriodBase):
    id: int
    topic_id: int
    period_id: int
