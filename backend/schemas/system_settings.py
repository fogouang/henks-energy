"""System settings schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


class SystemSettingBase(BaseModel):
    """Base schema for system setting."""
    
    key: str = Field(..., max_length=100, description="Setting key")
    value: str = Field(..., description="Setting value")
    description: str | None = Field(None, description="Setting description")


class SystemSettingCreate(SystemSettingBase):
    """Schema for creating a system setting."""
    pass


class SystemSettingUpdate(BaseModel):
    """Schema for updating a system setting."""
    
    value: str = Field(..., description="Setting value")
    description: str | None = Field(None, description="Setting description")


class SystemSettingResponse(SystemSettingBase):
    """Schema for system setting response."""
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SystemSettingsList(BaseModel):
    """Schema for list of system settings."""
    
    settings: list[SystemSettingResponse]
    total: int


# Specific settings schemas for reverse SSH
class ReverseSSHSettingsUpdate(BaseModel):
    """Schema for updating reverse SSH settings."""
    
    host: str = Field(..., max_length=255, description="SSH server hostname")
    user: str = Field(..., max_length=100, description="SSH username")
    port: int = Field(22, ge=1, le=65535, description="SSH server port")


class ReverseSSHSettingsResponse(BaseModel):
    """Schema for reverse SSH settings response."""
    
    host: str
    user: str
    port: int

