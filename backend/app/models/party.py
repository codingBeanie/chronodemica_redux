from sqlmodel import Field, SQLModel


class PartyBase(SQLModel):
    abbreviation: str
    name: str
    color_bg: str
    color_text: str
    founded: int | None = None
    dissolved: int | None = None
    seat_orientation: int = Field(default=50, ge=0, le=100)


class Party(PartyBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    world_id: int = Field(foreign_key="world.id")


class PartyCreate(PartyBase):
    pass


class PartyUpdate(SQLModel):
    abbreviation: str | None = None
    name: str | None = None
    color_bg: str | None = None
    color_text: str | None = None
    founded: int | None = None
    dissolved: int | None = None
    seat_orientation: int | None = Field(default=None, ge=0, le=100)


class PartyRead(PartyBase):
    id: int
    world_id: int
