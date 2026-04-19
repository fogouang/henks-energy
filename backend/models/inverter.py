"""Inverter model for solar PV inverters."""
import enum
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class InverterStatus(str, enum.Enum):
    """Inverter status enumeration."""

    ACTIVE = "active"
    DIMMED = "dimmed"
    DISABLED = "disabled"
    ERROR = "error"


class Inverter(BaseModel):
    """Solar PV inverter for an installation."""

    __tablename__ = "inverters"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    inverter_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Configuration
    rated_power_kw: Mapped[float] = mapped_column(Float, nullable=False)

    # Current state
    current_power_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    curtailment_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    status: Mapped[InverterStatus] = mapped_column(
        String(20), nullable=False, default=InverterStatus.ACTIVE
    )

    # Timestamps
    last_measurement_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="inverters"
    )

    __table_args__ = (
        UniqueConstraint("installation_id", "inverter_number"),
        CheckConstraint("inverter_number >= 1 AND inverter_number <= 8"),
        CheckConstraint("curtailment_percentage >= 0 AND curtailment_percentage <= 100"),
    )

    def __repr__(self) -> str:
        return f"<Inverter(id={self.id}, installation_id={self.installation_id}, number={self.inverter_number})>"

