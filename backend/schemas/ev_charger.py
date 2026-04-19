"""EV Charger schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field

from backend.models.ev_charger import ChargerSource


class EVChargerBase(BaseModel):
    """Base EV charger schema."""

    charger_number: int = Field(..., ge=1, le=4)
    tariff_per_kwh: float = Field(..., gt=0)
    session_active: bool = Field(default=False)
    session_energy_kwh: float = Field(default=0.0, ge=0)
    session_source: ChargerSource | None = None
    session_revenue_eur: float = Field(default=0.0, ge=0)
    total_revenue_eur: float = Field(default=0.0, ge=0)


class EVChargerUpdate(BaseModel):
    """Schema for updating EV charger."""

    tariff_per_kwh: float | None = Field(None, gt=0)
    session_active: bool | None = None
    session_energy_kwh: float | None = Field(None, ge=0)
    session_source: ChargerSource | None = None
    session_revenue_eur: float | None = Field(None, ge=0)
    total_revenue_eur: float | None = Field(None, ge=0)


class EVChargerResponse(EVChargerBase):
    """Schema for EV charger response."""

    id: int
    installation_id: int
    session_start_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EVChargerSession(BaseModel):
    """Schema for EV charger session."""

    charger_id: int
    session_active: bool
    session_energy_kwh: float
    session_source: ChargerSource | None
    session_revenue_eur: float
    session_duration_minutes: int


class EVChargerInfo(BaseModel):
    """Minimal EV charger info for edge devices."""

    id: int
    charger_number: int

    class Config:
        from_attributes = True


class EVChargerList(BaseModel):
    """Schema for EV charger list response for edge devices."""

    chargers: List[EVChargerInfo]
    total: int

