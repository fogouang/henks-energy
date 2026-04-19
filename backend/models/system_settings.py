"""System settings model for application-wide configuration."""
from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base, TimestampMixin


class SystemSetting(Base, TimestampMixin):
    """Key-value store for system-wide settings.
    
    Used for settings that can be configured via admin dashboard,
    with fallback to environment variables.
    """

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True, nullable=False)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<SystemSetting(key='{self.key}', value='{self.value[:50]}...')>"

