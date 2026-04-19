"""Inverter schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from backend.models.inverter import InverterStatus


class InverterBase(BaseModel):
    """Base inverter schema."""

    inverter_number: int = Field(..., ge=1, le=8)
    rated_power_kw: float = Field(..., gt=0)
    current_power_kw: float = Field(default=0.0)
    curtailment_percentage: float = Field(default=0.0, ge=0, le=100)
    status: InverterStatus = Field(default=InverterStatus.ACTIVE)


class InverterUpdate(BaseModel):
    """Schema for updating inverter."""

    rated_power_kw: float | None = Field(None, gt=0)
    current_power_kw: float | None = None
    curtailment_percentage: float | None = Field(None, ge=0, le=100)
    status: InverterStatus | None = None


class InverterResponse(InverterBase):
    """Schema for inverter response."""

    id: int
    installation_id: int
    last_measurement_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class InverterList(BaseModel):
    """Schema for inverter list response."""

    inverters: List[InverterResponse]
    total: int


class InverterInfo(BaseModel):
    """Minimal inverter info for edge devices."""

    id: int
    inverter_number: int

    class Config:
        from_attributes = True


class InverterListForDevice(BaseModel):
    """Schema for inverter list response for edge devices."""

    inverters: List[InverterInfo]
    total: int

