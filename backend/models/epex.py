"""EPEX spot price model for energy market prices."""
from datetime import datetime
from sqlalchemy import DateTime, Float, func
from sqlalchemy.orm import Mapped, mapped_column
from backend.models.base import Base


class EPEXSpotPrice(Base):
    """EPEX spot price - one record per hour."""

    __tablename__ = "epex_spot_prices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    date_hour: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, unique=True, index=True
    )
    price: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<EPEXSpotPrice(date_hour='{self.date_hour}', price={self.price})>"