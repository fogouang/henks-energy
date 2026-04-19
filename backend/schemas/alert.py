"""Alert schemas."""
from datetime import datetime

from pydantic import BaseModel, Field

from backend.models.alert import ComponentType, NotificationMethod


class AlertRuleBase(BaseModel):
    """Base alert rule schema."""

    component_type: ComponentType
    condition: str = Field(..., max_length=100)
    threshold: float
    notification_method: NotificationMethod = Field(default=NotificationMethod.EMAIL)
    is_active: bool = Field(default=True)


class AlertRuleCreate(AlertRuleBase):
    """Schema for creating an alert rule."""

    installation_id: int


class AlertRuleUpdate(BaseModel):
    """Schema for updating an alert rule."""

    condition: str | None = Field(None, max_length=100)
    threshold: float | None = None
    notification_method: NotificationMethod | None = None
    is_active: bool | None = None


class AlertRuleResponse(AlertRuleBase):
    """Schema for alert rule response."""

    id: int
    installation_id: int
    last_triggered_at: datetime | None
    trigger_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

