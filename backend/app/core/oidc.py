from authlib.integrations.starlette_client import OAuth

from app.core.config import settings

oauth = OAuth()
oauth.register(
    name="oidc",
    server_metadata_url=f"{settings.oidc_issuer}/.well-known/openid-configuration",
    client_id=settings.oidc_client_id,
    client_secret=settings.oidc_client_secret,
    client_kwargs={"scope": settings.oidc_scopes},
)
