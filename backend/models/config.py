"""Installation configuration model."""
import enum

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class ConfigValueType(str, enum.Enum):
    """Configuration value type enumeration."""

    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"


class InstallationConfig(BaseModel):
    """Key-value configuration storage for installations."""

    __tablename__ = "installation_configs"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    config_key: Mapped[str] = mapped_column(String(100), nullable=False)
    config_value: Mapped[str] = mapped_column(String(500), nullable=False)
    value_type: Mapped[ConfigValueType] = mapped_column(
        String(20), nullable=False, default=ConfigValueType.STRING
    )

    updated_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="configs"
    )

    __table_args__ = (
        UniqueConstraint("installation_id", "config_key"),
    )

    def __repr__(self) -> str:
        return f"<InstallationConfig(installation_id={self.installation_id}, key='{self.config_key}')>"

