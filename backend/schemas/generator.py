"""Generator schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from backend.models.generator import GeneratorStatus


class GeneratorBase(BaseModel):
    """Base generator schema."""

    fuel_cost_per_liter: float = Field(default=1.50, gt=0)
    rated_power_kw: float = Field(..., gt=0)
    status: GeneratorStatus = Field(default=GeneratorStatus.OFF)
    fuel_consumption_lph: float = Field(default=0.0, ge=0)
    charging_power_kw: float = Field(default=0.0)
    runtime_hours: float = Field(default=0.0, ge=0)


class GeneratorUpdate(BaseModel):
    """Schema for updating generator."""

    fuel_cost_per_liter: float | None = Field(None, gt=0)
    rated_power_kw: float | None = Field(None, gt=0)
    status: GeneratorStatus | None = None
    fuel_consumption_lph: float | None = Field(None, ge=0)
    charging_power_kw: float | None = None
    runtime_hours: float | None = Field(None, ge=0)


class GeneratorResponse(GeneratorBase):
    """Schema for generator response."""

    id: int
    installation_id: int
    last_start_at: datetime | None
    last_stop_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GeneratorStatusResponse(BaseModel):
    """Schema for generator status."""

    status: GeneratorStatus
    fuel_consumption_lph: float
    charging_power_kw: float
    runtime_hours: float
    cost_today_eur: float

