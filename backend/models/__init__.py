"""ORM models package."""
from backend.models.alert import AlertRule, ComponentType, NotificationMethod
from backend.models.base import Base, BaseModel, SoftDeleteMixin, TimestampMixin
from backend.models.battery import Battery, BatteryStatus
from backend.models.config import ConfigValueType, InstallationConfig
from backend.models.edge_device import EdgeDevice
from backend.models.epex import EPEXSpotPrice
from backend.models.ev_charger import ChargerSource, EVCharger
from backend.models.firmware import Firmware
from backend.models.generator import Generator, GeneratorStatus
from backend.models.installation import Installation
from backend.models.inverter import Inverter, InverterStatus
from backend.models.measurements import (
    BatteryMeasurement,
    EVChargerMeasurement,
    GeneratorMeasurement,
    InverterMeasurement,
    MeterMeasurement,
)
from backend.models.meter import MainMeter
from backend.models.reverse_ssh import ReverseSSH
from backend.models.user import AccessLevel, User, UserInstallation, UserRole

__all__ = [
    # Base
    "Base",
    "BaseModel",
    "TimestampMixin",
    "SoftDeleteMixin",
    # Core models
    "Installation",
    "EdgeDevice",
    "Battery",
    "BatteryStatus",
    "Inverter",
    "InverterStatus",
    "Generator",
    "GeneratorStatus",
    "EVCharger",
    "ChargerSource",
    "MainMeter",
    # Measurements
    "BatteryMeasurement",
    "InverterMeasurement",
    "MeterMeasurement",
    "GeneratorMeasurement",
    "EVChargerMeasurement",
    # User & Access
    "User",
    "UserRole",
    "UserInstallation",
    "AccessLevel",
    # Configuration
    "InstallationConfig",
    "ConfigValueType",
    # Alerts
    "AlertRule",
    "ComponentType",
    "NotificationMethod",
    # EPEX
    "EPEXSpotPrice",
    # Reverse SSH
    "ReverseSSH",
    # Firmware
    "Firmware",
]
