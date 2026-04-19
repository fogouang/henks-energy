"""Configuration schemas."""
from datetime import datetime
from typing import Dict

from pydantic import BaseModel, Field

from backend.models.config import ConfigValueType


class ConfigBase(BaseModel):
    """Base configuration schema."""

    config_key: str = Field(..., max_length=100)
    config_value: str = Field(..., max_length=500)
    value_type: ConfigValueType = Field(default=ConfigValueType.STRING)


class ConfigResponse(ConfigBase):
    """Schema for configuration response."""

    id: int
    installation_id: int
    updated_by_user_id: int | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConfigUpdate(BaseModel):
    """Schema for updating a single configuration."""

    config_value: str = Field(..., max_length=500)
    value_type: ConfigValueType | None = None


class ConfigBulkUpdate(BaseModel):
    """Schema for bulk configuration update."""

    configs: Dict[str, str] = Field(..., description="Key-value pairs of configuration")

