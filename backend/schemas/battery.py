"""Battery schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from backend.models.battery import BatteryStatus


class BatteryBase(BaseModel):
    """Base battery schema."""

    capacity_kwh: float = Field(..., gt=0)
    evening_reserve_percentage: float = Field(default=30.0, ge=0, le=100)
    minimum_reserve_percentage: float = Field(default=20.0, ge=0, le=100)
    soc_percentage: float = Field(default=0.0, ge=0, le=100)
    current_power_kw: float = Field(default=0.0)
    status: BatteryStatus = Field(default=BatteryStatus.IDLE)


class BatteryUpdate(BaseModel):
    """Schema for updating battery."""

    capacity_kwh: float | None = Field(None, gt=0)
    evening_reserve_percentage: float | None = Field(None, ge=0, le=100)
    minimum_reserve_percentage: float | None = Field(None, ge=0, le=100)
    soc_percentage: float | None = Field(None, ge=0, le=100)
    current_power_kw: float | None = None
    status: BatteryStatus | None = None


class BatteryResponse(BatteryBase):
    """Schema for battery response."""

    id: int
    installation_id: int
    last_measurement_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BatteryState(BaseModel):
    """Schema for battery current state."""

    soc_percentage: float
    current_power_kw: float
    status: BatteryStatus
    available_kwh: float
    visual_state: str  # "good", "warning", "critical"

