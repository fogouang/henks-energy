"""Generator model for backup power generation."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class GeneratorStatus(str, enum.Enum):
    """Generator status enumeration."""

    ON = "on"
    OFF = "off"
    STARTING = "starting"
    ERROR = "error"


class Generator(BaseModel):
    """Backup generator for an installation."""

    __tablename__ = "generators"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Configuration
    fuel_cost_per_liter: Mapped[float] = mapped_column(Float, nullable=False, default=1.50)
    rated_power_kw: Mapped[float] = mapped_column(Float, nullable=False)

    # Current state
    status: Mapped[GeneratorStatus] = mapped_column(
        String(20), nullable=False, default=GeneratorStatus.OFF
    )
    fuel_consumption_lph: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    charging_power_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    runtime_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Timestamps
    last_start_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_stop_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="generator"
    )

    def __repr__(self) -> str:
        return f"<Generator(id={self.id}, installation_id={self.installation_id}, status={self.status})>"

