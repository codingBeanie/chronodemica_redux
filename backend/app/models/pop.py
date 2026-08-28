from sqlmodel import Field, SQLModel


class PopBase(SQLModel):
    name: str
    description: str
    color_bg: str
    color_text: str


class Pop(PopBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    world_id: int = Field(foreign_key="world.id")


class PopCreate(PopBase):
    pass


class PopUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    color_bg: str | None = None
    color_text: str | None = None


class PopRead(PopBase):
    id: int
    world_id: int
