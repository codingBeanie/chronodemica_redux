from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "Chronodemica"
    database_url: str = "sqlite:///./data/chronodemica.db"
    cors_origins: list[str] = ["http://localhost:5180"]

    frontend_url: str = "http://localhost:5180"
    session_secret_key: str = "dev-insecure-session-secret-change-me"

    oidc_issuer: str = ""
    oidc_client_id: str = ""
    oidc_client_secret: str = ""
    oidc_redirect_uri: str = "http://localhost:8010/api/auth/oidc/callback"
    oidc_scopes: str = "openid profile email"


settings = Settings()
