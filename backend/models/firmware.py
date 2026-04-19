"""Firmware model for managing edge device firmware updates."""
from sqlalchemy import BigInteger, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.models.base import BaseModel


class Firmware(BaseModel):
    """Represents a firmware version for edge devices."""

    __tablename__ = "firmware"

    version: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    build_number: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA256 hex
    release_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_firmware_version_build", "version", "build_number"),
        Index("idx_firmware_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Firmware(id={self.id}, version='{self.version}', build={self.build_number})>"

