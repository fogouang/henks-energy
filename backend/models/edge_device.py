"""Edge device model for managing IoT devices."""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class EdgeDevice(BaseModel):
    """Represents an edge device (Raspberry Pi) that sends measurement data."""

    __tablename__ = "edge_devices"

    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, default=None
    )

    # Relationships
    installation: Mapped["Installation"] = relationship(
        "Installation",
        back_populates="edge_devices",
    )
    reverse_ssh: Mapped["ReverseSSH | None"] = relationship(
        "ReverseSSH",
        back_populates="device",
        uselist=False,
    )

    __table_args__ = (
        Index("idx_edge_device_installation", "installation_id"),
        Index("idx_edge_device_token", "token"),
    )

    def __repr__(self) -> str:
        return f"<EdgeDevice(id={self.id}, name='{self.name}', installation_id={self.installation_id})>"

