"""EV Charger model for electric vehicle charging points."""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
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


class ChargerSource(str, enum.Enum):
    """Charging source enumeration."""

    BATTERY = "battery"
    GRID = "grid"


class EVCharger(BaseModel):
    """Electric vehicle charger for an installation."""

    __tablename__ = "ev_chargers"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    charger_number: Mapped[int] = mapped_column(Integer, nullable=False)

    # Configuration
    tariff_per_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    # Current state
    session_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    session_energy_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    session_source: Mapped[ChargerSource | None] = mapped_column(
        String(20), nullable=True
    )

    # Revenue tracking
    session_revenue_eur: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    total_revenue_eur: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Timestamps
    session_start_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="ev_chargers"
    )

    __table_args__ = (
        UniqueConstraint("installation_id", "charger_number"),
        CheckConstraint("charger_number >= 1 AND charger_number <= 4"),
    )

    def __repr__(self) -> str:
        return f"<EVCharger(id={self.id}, installation_id={self.installation_id}, number={self.charger_number})>"

