"""Reverse SSH configuration schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


class ReverseSSHCreate(BaseModel):
    """Schema for creating a reverse SSH configuration."""

    enabled: bool = Field(default=False, description="Whether the reverse SSH tunnel is enabled")
    host: str | None = Field(None, max_length=255, description="SSH server hostname or IP address (defaults to systemwide config)")
    user: str | None = Field(None, max_length=100, description="SSH username (defaults to systemwide config)")
    ssh_port: int = Field(default=22, ge=1, le=65535, description="SSH server port (default: 22)")


class ReverseSSHUpdate(BaseModel):
    """Schema for updating a reverse SSH configuration."""

    enabled: bool | None = Field(None, description="Whether the reverse SSH tunnel is enabled")
    host: str | None = Field(None, max_length=255, description="SSH server hostname or IP address")
    user: str | None = Field(None, max_length=100, description="SSH username")
    ssh_port: int | None = Field(None, ge=1, le=65535, description="SSH server port")


class ReverseSSHResponse(BaseModel):
    """Schema for reverse SSH configuration response."""

    id: int | None = None  # None when returning defaults (no config exists)
    device_id: int
    enabled: bool
    host: str
    user: str
    ssh_port: int
    created_at: datetime | None = None  # None when returning defaults
    updated_at: datetime | None = None  # None when returning defaults

    class Config:
        from_attributes = True
