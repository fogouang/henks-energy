"""Edge device schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class EdgeDeviceCreate(BaseModel):
    """Schema for creating an edge device."""

    name: str = Field(..., max_length=255, description="Device name/identifier")
    description: str | None = Field(None, description="Optional device description")
    installation_id: int = Field(..., description="Installation ID this device belongs to")


class EdgeDeviceUpdate(BaseModel):
    """Schema for updating an edge device."""

    name: str | None = Field(None, max_length=255)
    description: str | None = None
    is_active: bool | None = None


class EdgeDeviceResponse(BaseModel):
    """Schema for edge device response (includes token only when created/regenerated)."""

    id: int
    device_id: int
    installation_id: int
    name: str
    token: str | None = None  # Only included in create/regenerate responses
    description: str | None
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EdgeDeviceListResponse(BaseModel):
    """Schema for edge device list response (no tokens)."""

    id: int
    installation_id: int
    name: str
    description: str | None
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime
    updated_at: datetime
    reverse_ssh_enabled: bool | None = None  # None if no ReverseSSH config exists

    class Config:
        from_attributes = True


class EdgeDeviceList(BaseModel):
    """Schema for list of edge devices."""

    devices: List[EdgeDeviceListResponse]
    total: int


class EdgeDeviceProvisionResponse(BaseModel):
    """Schema for device provisioning (environment variables)."""

    token: str
    api_url: str
    installation_id: int

