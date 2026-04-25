"""Time-series measurement models for hypertables."""
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Index,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import Base


class BatteryMeasurement(Base):
    """Time-series battery measurements (hypertable)."""

    __tablename__ = "battery_measurements"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    soc_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    voltage: Mapped[float | None] = mapped_column(Float, nullable=True)
    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    available_capacity: Mapped[float | None] = mapped_column(Float, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_battery_installation_timestamp", "installation_id", "timestamp"),
    )


class InverterMeasurement(Base):
    """Time-series inverter measurements (hypertable)."""

    __tablename__ = "inverter_measurements"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    inverter_id: Mapped[int] = mapped_column(
        ForeignKey("inverters.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    energy_kwh_daily: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    curtailment_percentage: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "idx_inverter_installation_timestamp",
            "installation_id",
            "inverter_id",
            "timestamp",
        ),
    )


class MeterMeasurement(Base):
    """Time-series meter measurements (hypertable)."""

    __tablename__ = "meter_measurements"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    import_kw: Mapped[float] = mapped_column(Float, nullable=False)
    export_kw: Mapped[float] = mapped_column(Float, nullable=False)
    import_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    export_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    l1_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    l2_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    l3_a: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_meter_installation_timestamp", "installation_id", "timestamp"),
    )


class GeneratorMeasurement(Base):
    """Time-series generator measurements (hypertable)."""

    __tablename__ = "generator_measurements"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(String(20), nullable=False)
    fuel_consumption_lph: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    charging_power_kw: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index("idx_generator_installation_timestamp", "installation_id", "timestamp"),
    )


class EVChargerMeasurement(Base):
    """Time-series EV charger measurements (hypertable)."""

    __tablename__ = "ev_charger_measurements"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), primary_key=True, nullable=False
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )
    charger_id: Mapped[int] = mapped_column(
        ForeignKey("ev_chargers.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
        index=True,
    )

    power_kw: Mapped[float] = mapped_column(Float, nullable=False)
    energy_kwh: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    revenue_eur: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        Index(
            "idx_ev_charger_installation_timestamp",
            "installation_id",
            "charger_id",
            "timestamp",
        ),
    )

