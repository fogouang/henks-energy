"""Installation model representing a customer site."""
from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class Installation(BaseModel):
    """Represents a customer installation site."""

    __tablename__ = "installations"

    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="Europe/Amsterdam")

    # Configuration flags
    has_pv: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    has_battery: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    has_generator: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    has_ev_chargers: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Component counts
    inverter_count: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    charger_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    battery: Mapped["Battery | None"] = relationship(
        "Battery",
        back_populates="installation",
        uselist=False,
        cascade="all, delete-orphan",
    )
    inverters: Mapped[list["Inverter"]] = relationship(
        "Inverter",
        back_populates="installation",
        cascade="all, delete-orphan",
        order_by="Inverter.inverter_number",
    )
    generator: Mapped["Generator | None"] = relationship(
        "Generator",
        back_populates="installation",
        uselist=False,
        cascade="all, delete-orphan",
    )
    ev_chargers: Mapped[list["EVCharger"]] = relationship(
        "EVCharger",
        back_populates="installation",
        cascade="all, delete-orphan",
        order_by="EVCharger.charger_number",
    )
    main_meter: Mapped["MainMeter | None"] = relationship(
        "MainMeter",
        back_populates="installation",
        uselist=False,
        cascade="all, delete-orphan",
    )
    configs: Mapped[list["InstallationConfig"]] = relationship(
        "InstallationConfig",
        back_populates="installation",
        cascade="all, delete-orphan",
    )
    alert_rules: Mapped[list["AlertRule"]] = relationship(
        "AlertRule",
        back_populates="installation",
        cascade="all, delete-orphan",
    )
    user_installations: Mapped[list["UserInstallation"]] = relationship(
        "UserInstallation",
        back_populates="installation",
        cascade="all, delete-orphan",
    )
    edge_devices: Mapped[list["EdgeDevice"]] = relationship(
        "EdgeDevice",
        back_populates="installation",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Installation(id={self.id}, name='{self.name}')>"

