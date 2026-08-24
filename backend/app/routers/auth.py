from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, SQLModel

from app.db.seed import create_default_world
from app.db.session import get_session
from app.dependencies import get_bearer_token, require_auth
from app.models.user import User
from app.services.auth import authenticate, delete_session, is_configured, setup_initial_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class AuthStatus(SQLModel):
    configured: bool


class Credentials(SQLModel):
    username: str
    password: str


class AuthResponse(SQLModel):
    token: str
    username: str


class MeResponse(SQLModel):
    username: str


@router.get("/status", response_model=AuthStatus)
def get_auth_status(session: Session = Depends(get_session)):
    return AuthStatus(configured=is_configured(session))


@router.post("/setup", response_model=AuthResponse, status_code=201)
def setup(credentials: Credentials, session: Session = Depends(get_session)):
    if is_configured(session):
        raise HTTPException(status_code=409, detail="An account has already been set up.")
    if not credentials.username.strip() or not credentials.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")
    user, token = setup_initial_user(session, credentials.username.strip(), credentials.password)
    create_default_world(session, user.id)
    return AuthResponse(token=token, username=user.username)


@router.post("/login", response_model=AuthResponse)
def login(credentials: Credentials, session: Session = Depends(get_session)):
    result = authenticate(session, credentials.username.strip(), credentials.password)
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    user, token = result
    return AuthResponse(token=token, username=user.username)


@router.post("/logout", status_code=204)
def logout(token: str = Depends(get_bearer_token), session: Session = Depends(get_session)):
    delete_session(session, token)


@router.get("/me", response_model=MeResponse)
def get_me(user: User = Depends(require_auth)):
    return MeResponse(username=user.username)
