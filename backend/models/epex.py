"""EPEX spot price model for energy market prices."""
from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class EPEXSpotPrice(Base):
    """EPEX spot price time-series data (hypertable)."""

    __tablename__ = "epex_spot_prices"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    region: Mapped[str] = mapped_column(
        String(10), primary_key=True, nullable=False, index=True
    )

    price_eur_per_kwh: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_epex_region_timestamp", "region", "timestamp"),
    )

