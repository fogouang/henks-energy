"""Alert rule model for monitoring and notifications."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class ComponentType(str, enum.Enum):
    """Component type for alert rules."""

    BATTERY = "battery"
    INVERTER = "inverter"
    GENERATOR = "generator"
    METER = "meter"


class NotificationMethod(str, enum.Enum):
    """Notification method enumeration."""

    EMAIL = "email"
    SMS = "sms"


class AlertRule(BaseModel):
    """Alert rule for monitoring component thresholds."""

    __tablename__ = "alert_rules"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    component_type: Mapped[ComponentType] = mapped_column(String(20), nullable=False)
    condition: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g., "soc < 20"
    threshold: Mapped[float] = mapped_column(Float, nullable=False)
    notification_method: Mapped[NotificationMethod] = mapped_column(
        String(20), nullable=False, default=NotificationMethod.EMAIL
    )

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    trigger_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="alert_rules"
    )

    def __repr__(self) -> str:
        return f"<AlertRule(id={self.id}, installation_id={self.installation_id}, component={self.component_type})>"

