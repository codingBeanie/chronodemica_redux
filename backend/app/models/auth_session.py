from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class AuthSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True)
    user_id: int = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
