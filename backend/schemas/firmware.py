"""Firmware schemas for edge device firmware management."""
from datetime import datetime

from pydantic import BaseModel, Field


class FirmwareCreate(BaseModel):
    """Schema for creating firmware (used with file upload)."""

    version: str = Field(..., max_length=50, description="Firmware version (e.g., '1.2.0')")
    build_number: int = Field(..., ge=1, description="Build number (integer)")
    release_notes: str | None = Field(None, description="Optional release notes")


class FirmwareResponse(BaseModel):
    """Schema for firmware response."""

    id: int
    version: str
    build_number: int
    filename: str
    file_size: int
    checksum: str
    release_notes: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FirmwareListResponse(BaseModel):
    """Schema for firmware list item (shorter response)."""

    id: int
    version: str
    build_number: int
    filename: str
    file_size: int
    created_at: datetime

    class Config:
        from_attributes = True


class FirmwareList(BaseModel):
    """Schema for list of firmware versions."""

    firmware: list[FirmwareListResponse]
    total: int


class FirmwareLatestResponse(BaseModel):
    """Schema for latest firmware response (for devices)."""

    id: int
    version: str
    build_number: int
    file_size: int
    checksum: str
    release_notes: str | None
    download_url: str
    created_at: datetime

    class Config:
        from_attributes = True

