from sqlmodel import Session, select

from app.core.security import generate_token, hash_password, verify_password
from app.models.auth_session import AuthSession
from app.models.user import User


def is_configured(session: Session) -> bool:
    return session.exec(select(User)).first() is not None


def create_session(session: Session, user: User) -> str:
    token = generate_token()
    session.add(AuthSession(token=token, user_id=user.id))
    session.commit()
    return token


def setup_initial_user(session: Session, username: str, password: str) -> tuple[User, str]:
    user = User(username=username, password_hash=hash_password(password))
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_session(session, user)
    return user, token


def authenticate(session: Session, username: str, password: str) -> tuple[User, str] | None:
    user = session.exec(select(User).where(User.username == username)).first()
    if user is None or not verify_password(password, user.password_hash):
        return None
    token = create_session(session, user)
    return user, token


def get_user_by_token(session: Session, token: str) -> User | None:
    auth_session = session.exec(select(AuthSession).where(AuthSession.token == token)).first()
    if auth_session is None:
        return None
    return session.get(User, auth_session.user_id)


def delete_session(session: Session, token: str) -> None:
    auth_session = session.exec(select(AuthSession).where(AuthSession.token == token)).first()
    if auth_session is not None:
        session.delete(auth_session)
        session.commit()
