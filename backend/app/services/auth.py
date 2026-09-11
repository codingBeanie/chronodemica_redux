from sqlmodel import Session, select

from app.core.security import generate_token
from app.db.seed import create_default_world
from app.models.auth_session import AuthSession
from app.models.user import User


def create_session(session: Session, user: User) -> str:
    token = generate_token()
    session.add(AuthSession(token=token, user_id=user.id))
    session.commit()
    return token


def get_or_create_user(
    session: Session,
    *,
    issuer: str,
    subject: str,
    email: str | None,
    display_name: str | None,
) -> User:
    user = session.exec(
        select(User).where(User.oidc_issuer == issuer, User.oidc_subject == subject)
    ).first()
    if user is not None:
        user.email = email
        user.display_name = display_name
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    # The very first person to ever complete an OIDC login becomes admin,
    # permanently — no other user can ever gain that flag afterwards.
    is_first_user = session.exec(select(User)).first() is None
    user = User(
        oidc_issuer=issuer,
        oidc_subject=subject,
        email=email,
        display_name=display_name,
        is_admin=is_first_user,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    if is_first_user:
        create_default_world(session, user.id)
    return user


# Fixed synthetic identity for the AUTH_DISABLED dev bypass (see dependencies.require_auth)
# — routed through the normal get_or_create_user() so it still becomes admin and gets a
# seeded default world the first time, exactly like a real OIDC login would.
DEV_USER_ISSUER = "dev"
DEV_USER_SUBJECT = "dev"


def get_or_create_dev_user(session: Session) -> User:
    return get_or_create_user(
        session,
        issuer=DEV_USER_ISSUER,
        subject=DEV_USER_SUBJECT,
        email="dev@localhost",
        display_name="Dev User",
    )


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
