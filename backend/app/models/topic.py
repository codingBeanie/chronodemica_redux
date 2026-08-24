from sqlmodel import Field, SQLModel


class TopicBase(SQLModel):
    name: str
    description: str


class Topic(TopicBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    world_id: int = Field(foreign_key="world.id")


class TopicCreate(TopicBase):
    pass


class TopicUpdate(SQLModel):
    name: str | None = None
    description: str | None = None


class TopicRead(TopicBase):
    id: int
    world_id: int
