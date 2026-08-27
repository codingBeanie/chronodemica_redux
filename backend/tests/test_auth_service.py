import pytest
from sqlmodel import Session, SQLModel, create_engine, select

from app.models.world import World
from app.services.auth import get_or_create_user


@pytest.fixture
def session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_first_login_becomes_admin_and_gets_a_default_world(session: Session) -> None:
    user = get_or_create_user(
        session, issuer="https://idp.example", subject="sub-1", email="a@example.com", display_name="Alice"
    )

    assert user.is_admin is True
    worlds = session.exec(select(World).where(World.owner_id == user.id)).all()
    assert len(worlds) == 1


def test_second_distinct_user_is_not_admin(session: Session) -> None:
    get_or_create_user(
        session, issuer="https://idp.example", subject="sub-1", email="a@example.com", display_name="Alice"
    )
    second = get_or_create_user(
        session, issuer="https://idp.example", subject="sub-2", email="b@example.com", display_name="Bob"
    )

    assert second.is_admin is False


def test_repeated_login_returns_same_user_without_changing_admin_flag(session: Session) -> None:
    first = get_or_create_user(
        session, issuer="https://idp.example", subject="sub-1", email="a@example.com", display_name="Alice"
    )
    again = get_or_create_user(
        session, issuer="https://idp.example", subject="sub-1", email="a@example.com", display_name="Alice A."
    )

    assert again.id == first.id
    assert again.is_admin is True
    assert again.display_name == "Alice A."
