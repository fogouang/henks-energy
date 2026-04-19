"""Installation schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class InstallationBase(BaseModel):
    """Base installation schema."""

    name: str = Field(..., max_length=255)
    country: str = Field(..., max_length=100, description="ISO country code (e.g., 'NL', 'US')")
    state: str | None = Field(None, max_length=100, description="State/province name (optional)")
    city: str = Field(..., max_length=100)
    timezone: str = Field(default="Europe/Amsterdam", max_length=50)
    has_pv: bool = Field(default=True)
    has_battery: bool = Field(default=True)
    has_generator: bool = Field(default=False)
    has_ev_chargers: bool = Field(default=False)
    inverter_count: int = Field(default=1, ge=1, le=8)
    charger_count: int = Field(default=0, ge=0, le=4)


class InstallationCreate(InstallationBase):
    """Schema for creating an installation."""

    user_id: int = Field(..., description="ID of the user who owns this installation")


class InstallationUpdate(BaseModel):
    """Schema for updating an installation."""

    name: str | None = Field(None, max_length=255)
    country: str | None = Field(None, max_length=100, description="ISO country code (e.g., 'NL', 'US')")
    state: str | None = Field(None, max_length=100, description="State/province name (optional)")
    city: str | None = Field(None, max_length=100)
    timezone: str | None = Field(None, max_length=50)
    has_pv: bool | None = None
    has_battery: bool | None = None
    has_generator: bool | None = None
    has_ev_chargers: bool | None = None
    inverter_count: int | None = Field(None, ge=1, le=8)
    charger_count: int | None = Field(None, ge=0, le=4)


class InstallationResponse(InstallationBase):
    """Schema for installation response."""

    id: int
    created_at: datetime
    updated_at: datetime
    owner_email: str | None = Field(None, description="Email of the installation owner (admin only)")

    class Config:
        from_attributes = True


class InstallationList(BaseModel):
    """Schema for installation list response."""

    installations: List[InstallationResponse]
    total: int


class InverterComponentItem(BaseModel):
    """Inverter with has_measurements flag for edit UI."""

    inverter_number: int = Field(..., description="Inverter number (1-based)")
    has_measurements: bool = Field(False, description="Whether this inverter has any measurement data")


class ChargerComponentItem(BaseModel):
    """EV charger with has_measurements flag for edit UI."""

    charger_number: int = Field(..., description="Charger number (1-based)")
    has_measurements: bool = Field(False, description="Whether this charger has any measurement data")


class InstallationComponentData(BaseModel):
    """Response for GET component-data: inverters and chargers with has_measurements."""

    inverters: List[InverterComponentItem] = Field(default_factory=list)
    chargers: List[ChargerComponentItem] = Field(default_factory=list)

