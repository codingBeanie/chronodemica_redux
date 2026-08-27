from datetime import UTC, datetime

from sqlmodel import Field, SQLModel, UniqueConstraint


class User(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("oidc_issuer", "oidc_subject"),)

    id: int | None = Field(default=None, primary_key=True)
    oidc_issuer: str
    oidc_subject: str
    email: str | None = None
    display_name: str | None = None
    is_admin: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
