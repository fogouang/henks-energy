"""Battery model for energy storage system."""
import enum
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class BatteryStatus(str, enum.Enum):
    """Battery status enumeration."""

    CHARGING = "charging"
    DISCHARGING = "discharging"
    IDLE = "idle"
    BLOCKED = "blocked"


class Battery(BaseModel):
    """Battery storage system for an installation."""

    __tablename__ = "batteries"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Configuration
    capacity_kwh: Mapped[float] = mapped_column(Float, nullable=False)
    evening_reserve_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=30.0
    )
    minimum_reserve_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=20.0
    )

    # Current state
    soc_percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    current_power_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[BatteryStatus] = mapped_column(
        String(20), nullable=False, default=BatteryStatus.IDLE
    )

    # Timestamps
    last_measurement_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="battery"
    )

    __table_args__ = (
        CheckConstraint("soc_percentage >= 0 AND soc_percentage <= 100"),
        CheckConstraint("evening_reserve_percentage >= minimum_reserve_percentage"),
    )

    def __repr__(self) -> str:
        return f"<Battery(id={self.id}, installation_id={self.installation_id}, soc={self.soc_percentage}%)>"

