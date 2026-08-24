from sqlmodel import Field, SQLModel


class PopBase(SQLModel):
    abbreviation: str
    name: str


class Pop(PopBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    world_id: int = Field(foreign_key="world.id")


class PopCreate(PopBase):
    pass


class PopUpdate(SQLModel):
    abbreviation: str | None = None
    name: str | None = None


class PopRead(PopBase):
    id: int
    world_id: int
