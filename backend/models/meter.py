"""Main meter model for grid import/export monitoring."""
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class MainMeter(BaseModel):
    """Main grid meter for an installation."""

    __tablename__ = "main_meters"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Current state
    import_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    export_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    import_kwh_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    export_kwh_total: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Phase currents
    l1_current_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    l2_current_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    l3_current_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # Timestamps
    last_measurement_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="main_meter"
    )

    def __repr__(self) -> str:
        return f"<MainMeter(id={self.id}, installation_id={self.installation_id})>"

