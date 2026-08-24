from collections.abc import Generator
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)


def _migrate_seats_from_world_to_period() -> None:
    """One-off migration for the `seats` field moving from World to Period.

    `SQLModel.metadata.create_all()` only creates missing tables, it never
    alters existing ones — so on a database created before this change,
    `period` is missing `seats` and `world` still has it. This backfills
    each period's seats from its (old) world value before create_all runs
    against the new models.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("period") or not db_inspector.has_table("world"):
        return

    period_columns = {col["name"] for col in db_inspector.get_columns("period")}
    world_columns = {col["name"] for col in db_inspector.get_columns("world")}

    with engine.begin() as conn:
        if "seats" not in period_columns:
            conn.execute(text("ALTER TABLE period ADD COLUMN seats INTEGER"))
            conn.execute(
                text(
                    "UPDATE period SET seats = COALESCE("
                    "(SELECT seats FROM world WHERE world.id = period.world_id), 100)"
                )
            )
        if "seats" in world_columns:
            conn.execute(text("ALTER TABLE world DROP COLUMN seats"))


def init_db() -> None:
    db_path = make_url(settings.database_url).database
    if db_path and db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _migrate_seats_from_world_to_period()
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
