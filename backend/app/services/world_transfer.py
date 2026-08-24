import tempfile
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine, select

from app.models.parliament_period import ParliamentPeriod
from app.models.party import Party
from app.models.party_period import PartyPeriod
from app.models.party_statement import PartyStatement
from app.models.period import Period
from app.models.pop import Pop
from app.models.pop_period import PopPeriod
from app.models.pop_statement import PopStatement
from app.models.statement import Statement
from app.models.topic import Topic
from app.models.topic_period import TopicPeriod
from app.models.votes import Votes
from app.models.world import World
from app.services.world_reset import delete_all_data

_MODEL_BY_KEY: dict[str, type] = {
    "parties": Party,
    "pops": Pop,
    "topics": Topic,
    "statements": Statement,
    "periods": Period,
    "party_periods": PartyPeriod,
    "pop_periods": PopPeriod,
    "topic_periods": TopicPeriod,
    "party_statements": PartyStatement,
    "pop_statements": PopStatement,
    "votes": Votes,
    "parliament_periods": ParliamentPeriod,
}

# Keys whose rows carry a direct `world_id` foreign key that must be re-pointed on import.
_WORLD_SCOPED_KEYS = ("parties", "pops", "topics", "periods")
_PERIOD_SCOPED_KEYS = (
    "party_periods",
    "pop_periods",
    "topic_periods",
    "party_statements",
    "pop_statements",
    "votes",
    "parliament_periods",
)


class InvalidWorldFileError(Exception):
    pass


def _collect_world_rows(session: Session, world_id: int) -> dict[str, list]:
    parties = session.exec(select(Party).where(Party.world_id == world_id)).all()
    pops = session.exec(select(Pop).where(Pop.world_id == world_id)).all()
    topics = session.exec(select(Topic).where(Topic.world_id == world_id)).all()
    topic_ids = [t.id for t in topics]
    statements = (
        session.exec(select(Statement).where(Statement.topic_id.in_(topic_ids))).all() if topic_ids else []
    )
    periods = session.exec(select(Period).where(Period.world_id == world_id)).all()
    period_ids = [p.id for p in periods]

    def scoped(model: type) -> list:
        return session.exec(select(model).where(model.period_id.in_(period_ids))).all() if period_ids else []

    return {
        "parties": parties,
        "pops": pops,
        "topics": topics,
        "statements": statements,
        "periods": periods,
        "party_periods": scoped(PartyPeriod),
        "pop_periods": scoped(PopPeriod),
        "topic_periods": scoped(TopicPeriod),
        "party_statements": scoped(PartyStatement),
        "pop_statements": scoped(PopStatement),
        "votes": scoped(Votes),
        "parliament_periods": scoped(ParliamentPeriod),
    }


def export_world(session: Session, world: World) -> Path:
    """Writes `world`'s data into a brand-new standalone SQLite file and returns its path."""
    rows = _collect_world_rows(session, world.id)

    tmp_path = Path(tempfile.mkstemp(suffix=".db")[1])
    tmp_path.unlink()

    export_engine = create_engine(f"sqlite:///{tmp_path}")
    SQLModel.metadata.create_all(export_engine)
    with Session(export_engine) as export_session:
        export_session.add(
            World(
                id=world.id,
                owner_id=world.owner_id,
                name=world.name,
                parliament_name=world.parliament_name,
            )
        )
        for key, model in _MODEL_BY_KEY.items():
            for row in rows[key]:
                export_session.add(model(**row.model_dump()))
        export_session.commit()
    export_engine.dispose()
    return tmp_path


def import_world(session: Session, world: World, uploaded_path: Path) -> None:
    """Replaces `world`'s data with the contents of a previously exported SQLite file."""
    import_engine = create_engine(f"sqlite:///{uploaded_path}")
    try:
        with Session(import_engine) as import_session:
            imported_world = import_session.exec(select(World)).first()
            if imported_world is None:
                raise InvalidWorldFileError("This file does not contain a Chronodemica world export.")
            rows = _collect_world_rows(import_session, imported_world.id)
            imported_name = imported_world.name
            imported_parliament_name = imported_world.parliament_name
    except InvalidWorldFileError:
        raise
    except Exception as error:
        raise InvalidWorldFileError("This file is not a valid SQLite database.") from error
    finally:
        import_engine.dispose()

    delete_all_data(session, world.id, commit=False)

    world.name = imported_name
    world.parliament_name = imported_parliament_name
    session.add(world)

    for key in _WORLD_SCOPED_KEYS:
        model = _MODEL_BY_KEY[key]
        for row in rows[key]:
            data = row.model_dump()
            data["world_id"] = world.id
            session.add(model(**data))

    for key in ("statements", *_PERIOD_SCOPED_KEYS):
        model = _MODEL_BY_KEY[key]
        for row in rows[key]:
            session.add(model(**row.model_dump()))

    session.commit()
