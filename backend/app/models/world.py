from sqlmodel import Field, SQLModel


class WorldBase(SQLModel):
    name: str
    parliament_name: str


class World(WorldBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    owner_id: int | None = Field(default=None, foreign_key="user.id")
