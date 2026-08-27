from fastapi import APIRouter, Depends, Request
from fastapi.responses import RedirectResponse
from sqlmodel import Session, SQLModel

from app.core.config import settings
from app.core.oidc import oauth
from app.db.session import get_session
from app.dependencies import get_bearer_token, require_auth
from app.models.user import User
from app.services.auth import create_session, delete_session, get_or_create_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


class MeResponse(SQLModel):
    id: int
    email: str | None
    display_name: str | None
    is_admin: bool


@router.get("/oidc/login")
async def oidc_login(request: Request):
    return await oauth.oidc.authorize_redirect(request, settings.oidc_redirect_uri)


@router.get("/oidc/callback")
async def oidc_callback(request: Request, session: Session = Depends(get_session)):
    token = await oauth.oidc.authorize_access_token(request)
    claims = token["userinfo"]
    user = get_or_create_user(
        session,
        issuer=claims["iss"],
        subject=claims["sub"],
        email=claims.get("email"),
        display_name=claims.get("name"),
    )
    app_token = create_session(session, user)
    return RedirectResponse(f"{settings.frontend_url}/#token={app_token}")


@router.post("/logout", status_code=204)
def logout(token: str = Depends(get_bearer_token), session: Session = Depends(get_session)):
    delete_session(session, token)


@router.get("/me", response_model=MeResponse)
def get_me(user: User = Depends(require_auth)):
    return MeResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_admin=user.is_admin,
    )
