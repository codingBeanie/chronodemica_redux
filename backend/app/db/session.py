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


def _rename_votes_table_if_party_id_not_null() -> None:
    """First half of the migration dropping the "Miscellaneous" placeholder party.

    `votes.party_id` used to be NOT NULL; unattributed votes (a statement no
    real party approved) were stored against a real, DB-persisted party named
    "Miscellaneous". That party never made sense as stored data — it's now a
    purely virtual bucket (`party_id IS NULL`), since it isn't a real party
    and must never win parliamentary seats.

    SQLite can't drop a NOT NULL constraint in place, so this renames the old
    table out of the way; `create_all()` (called right after, in `init_db()`)
    then builds a fresh `votes` table matching the current, nullable model.
    `_finish_votes_migration_and_drop_misc_party()` copies the data back in
    and cleans up the old Misc party afterwards.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("votes"):
        return

    party_id_column = next(
        (col for col in db_inspector.get_columns("votes") if col["name"] == "party_id"), None
    )
    if party_id_column is None or party_id_column["nullable"]:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE votes RENAME TO votes_old"))


def _finish_votes_migration_and_drop_misc_party() -> None:
    """Second half of the migration started in `_rename_votes_table_if_party_id_not_null()`.

    Must run after `create_all()` has (re)created `votes` from the current
    model. Copies the old rows into it, folds any votes that belonged to the
    old "Miscellaneous" party into the virtual Misc bucket (`party_id = NULL`),
    and removes that placeholder party and its now-meaningless seats.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("votes_old"):
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO votes (id, votes, period_id, party_id, pop_id) "
                "SELECT id, votes, period_id, party_id, pop_id FROM votes_old"
            )
        )
        conn.execute(text("DROP TABLE votes_old"))

        misc_party_ids = [
            row[0]
            for row in conn.execute(
                text("SELECT id FROM party WHERE name = 'Miscellaneous' AND abbreviation = 'MISC'")
            ).fetchall()
        ]
        if not misc_party_ids:
            return

        placeholders = ",".join(str(party_id) for party_id in misc_party_ids)
        conn.execute(text(f"UPDATE votes SET party_id = NULL WHERE party_id IN ({placeholders})"))
        for dependent_table in ("parliamentperiod", "partyperiod", "partystatement"):
            if db_inspector.has_table(dependent_table):
                conn.execute(
                    text(f"DELETE FROM {dependent_table} WHERE party_id IN ({placeholders})")
                )
        conn.execute(text(f"DELETE FROM party WHERE id IN ({placeholders})"))


def _migrate_user_table_to_oidc() -> None:
    """Drops the legacy password-based user/authsession tables so `create_all()`
    recreates them with the OIDC schema (oidc_issuer/oidc_subject/is_admin instead
    of username/password_hash).

    No data migration: confirmed with the user that the single existing
    password-account and the world(s) it owns don't need to survive the
    switch. `world.owner_id` may end up pointing at a deleted user id
    afterwards — harmless, since SQLite doesn't enforce FK constraints here
    and `list_worlds` simply won't match it against any (new) user again.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("user"):
        return
    if "username" not in {col["name"] for col in db_inspector.get_columns("user")}:
        return

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS authsession"))
        conn.execute(text("DROP TABLE user"))


def init_db() -> None:
    db_path = make_url(settings.database_url).database
    if db_path and db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _migrate_seats_from_world_to_period()
    _rename_votes_table_if_party_id_not_null()
    _migrate_user_table_to_oidc()
    SQLModel.metadata.create_all(engine)
    _finish_votes_migration_and_drop_misc_party()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
