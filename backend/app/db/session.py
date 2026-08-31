from collections.abc import Generator
from pathlib import Path

from sqlalchemy import inspect, text
from sqlalchemy.engine import make_url
from sqlmodel import Session, SQLModel, create_engine, select

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


def _migrate_pop_abbreviation_to_description() -> None:
    """Pop dropped `abbreviation` (redundant with `name`) in favor of a free-text
    `description`, matching Topic's name+description shape. Existing abbreviations
    aren't meaningful descriptions, so this is a schema-only migration — existing
    pops just get an empty description, editable afterward.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("pop"):
        return

    pop_columns = {col["name"] for col in db_inspector.get_columns("pop")}
    if "abbreviation" not in pop_columns:
        return

    with engine.begin() as conn:
        if "description" not in pop_columns:
            conn.execute(text("ALTER TABLE pop ADD COLUMN description VARCHAR NOT NULL DEFAULT ''"))
        conn.execute(text("ALTER TABLE pop DROP COLUMN abbreviation"))


def _migrate_popperiod_to_share() -> None:
    """population/eligibility -> Period.total_population + PopPeriod.share.

    `turnout` is untouched — it stays a per-pop-period field. Backfills
    total_population per period as the sum of that period's existing
    popperiod.population values, then converts each row's population into a
    share of that total (rounded, via SQLite integer math — minor drift away
    from summing to exactly 100 is expected and fixable afterward through the
    same live sum indicator already used for PopStatement approvals). Existing
    worlds not yet on the fixed 9-segment model keep whatever Pops they have —
    this migration only touches the PopPeriod/Period schema, not which Pops
    exist (that's a per-world opt-in via the "reset population segments"
    action, not something to force silently).
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("popperiod"):
        return

    popperiod_columns = {col["name"] for col in db_inspector.get_columns("popperiod")}
    if "population" not in popperiod_columns:
        return

    period_columns = {col["name"] for col in db_inspector.get_columns("period")}

    with engine.begin() as conn:
        if "total_population" not in period_columns:
            conn.execute(text("ALTER TABLE period ADD COLUMN total_population INTEGER NOT NULL DEFAULT 0"))
        conn.execute(
            text(
                "UPDATE period SET total_population = COALESCE("
                "(SELECT SUM(population) FROM popperiod WHERE popperiod.period_id = period.id), 0)"
            )
        )

        if "share" not in popperiod_columns:
            conn.execute(text("ALTER TABLE popperiod ADD COLUMN share INTEGER NOT NULL DEFAULT 0"))
        conn.execute(
            text(
                "UPDATE popperiod SET share = CAST(ROUND(100.0 * population / "
                "(SELECT total_population FROM period WHERE period.id = popperiod.period_id)"
                ") AS INTEGER) "
                "WHERE (SELECT total_population FROM period WHERE period.id = popperiod.period_id) > 0"
            )
        )

        conn.execute(text("ALTER TABLE popperiod DROP COLUMN population"))
        conn.execute(text("ALTER TABLE popperiod DROP COLUMN eligibility"))


def _migrate_add_misc_excluded_to_period() -> None:
    """Adds `Period.misc_excluded_from_parliament`, the new flag controlling
    whether the virtual "Misc" vote bucket competes for parliamentary seats
    like a real party. `create_all()` can't add columns to an existing table,
    so this backfills the column (default False = Misc competes for seats)
    for periods created before the flag existed.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("period"):
        return

    period_columns = {col["name"] for col in db_inspector.get_columns("period")}
    if "misc_excluded_from_parliament" in period_columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text("ALTER TABLE period ADD COLUMN misc_excluded_from_parliament BOOLEAN NOT NULL DEFAULT 0")
        )


def _rename_parliamentperiod_table_if_party_id_not_null() -> None:
    """First half of the migration making `parliamentperiod.party_id` nullable.

    The virtual "Misc" bucket can now win seats like a real party (see
    `Period.misc_excluded_from_parliament`), so a ParliamentPeriod row's
    party_id must be able to be NULL. SQLite can't drop a NOT NULL constraint
    in place, so this renames the old table out of the way; `create_all()`
    (called right after, in `init_db()`) then builds a fresh `parliamentperiod`
    table matching the current, nullable model.
    `_finish_parliamentperiod_migration()` copies the data back in.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("parliamentperiod"):
        return

    party_id_column = next(
        (col for col in db_inspector.get_columns("parliamentperiod") if col["name"] == "party_id"), None
    )
    if party_id_column is None or party_id_column["nullable"]:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE parliamentperiod RENAME TO parliamentperiod_old"))


def _finish_parliamentperiod_migration() -> None:
    """Second half of the migration started in
    `_rename_parliamentperiod_table_if_party_id_not_null()`. Must run after
    `create_all()` has (re)created `parliamentperiod` from the current model.
    """
    db_inspector = inspect(engine)
    if not db_inspector.has_table("parliamentperiod_old"):
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO parliamentperiod (id, seats, in_government, period_id, party_id) "
                "SELECT id, seats, in_government, period_id, party_id FROM parliamentperiod_old"
            )
        )
        conn.execute(text("DROP TABLE parliamentperiod_old"))


def _sync_party_periods_for_all_worlds() -> None:
    """Backfills PartyPeriod rows for every founded-and-not-yet-dissolved party
    across every existing world. Runs on every startup — additive and
    idempotent (see sync_party_periods), so it's cheap to always run, and it
    self-heals databases created before parties auto-joined every eligible
    period (including one restored via world import while the server wasn't
    running).
    """
    from app.models.world import World
    from app.services.party_periods import sync_party_periods

    with Session(engine) as session:
        world_ids = session.exec(select(World.id)).all()
        for world_id in world_ids:
            sync_party_periods(session, world_id)
        session.commit()


def init_db() -> None:
    db_path = make_url(settings.database_url).database
    if db_path and db_path != ":memory:":
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
    _migrate_seats_from_world_to_period()
    _rename_votes_table_if_party_id_not_null()
    _migrate_user_table_to_oidc()
    _migrate_pop_abbreviation_to_description()
    _migrate_popperiod_to_share()
    _migrate_add_misc_excluded_to_period()
    _rename_parliamentperiod_table_if_party_id_not_null()
    SQLModel.metadata.create_all(engine)
    _finish_votes_migration_and_drop_misc_party()
    _finish_parliamentperiod_migration()
    _sync_party_periods_for_all_worlds()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
