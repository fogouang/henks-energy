"""Reverse SSH configuration model for edge devices."""
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class ReverseSSH(BaseModel):
    """Represents reverse SSH tunnel configuration for an edge device."""

    __tablename__ = "reverse_ssh"

    device_id: Mapped[int] = mapped_column(
        ForeignKey("edge_devices.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    host: Mapped[str | None] = mapped_column(String(255), nullable=True)
    user: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ssh_port: Mapped[int] = mapped_column(Integer, nullable=False, default=22)

    # Relationships
    device: Mapped["EdgeDevice"] = relationship(
        "EdgeDevice",
        back_populates="reverse_ssh",
    )

    __table_args__ = (
        UniqueConstraint("device_id"),
        CheckConstraint("ssh_port >= 1 AND ssh_port <= 65535", name="check_ssh_port_range"),
    )

    def __repr__(self) -> str:
        return f"<ReverseSSH(id={self.id}, device_id={self.device_id}, host='{self.host}', enabled={self.enabled})>"

