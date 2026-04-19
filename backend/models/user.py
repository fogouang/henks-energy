"""User and access control models."""
import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.base import BaseModel


class UserRole(str, enum.Enum):
    """User role enumeration."""

    ADMIN = "admin"
    CUSTOMER = "customer"


class AccessLevel(str, enum.Enum):
    """Installation access level enumeration."""

    VIEW = "view"
    CONFIGURE = "configure"
    ADMIN = "admin"


class User(BaseModel):
    """User account for authentication and access control."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(20), nullable=False, default=UserRole.CUSTOMER)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Profile
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    language_preference: Mapped[str] = mapped_column(
        String(10), nullable=False, default="nl"
    )

    # Timestamps
    last_login_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    installations: Mapped[list["UserInstallation"]] = relationship(
        "UserInstallation", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', role={self.role})>"


class UserInstallation(BaseModel):
    """Association table for user-installation access."""

    __tablename__ = "user_installations"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    installation_id: Mapped[int] = mapped_column(
        ForeignKey("installations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    access_level: Mapped[AccessLevel] = mapped_column(
        String(20), nullable=False, default=AccessLevel.VIEW
    )

    # Timestamps
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="installations")
    installation: Mapped["Installation"] = relationship(
        "Installation", back_populates="user_installations"
    )

    __table_args__ = (
        UniqueConstraint("user_id", "installation_id"),
    )

    def __repr__(self) -> str:
        return f"<UserInstallation(user_id={self.user_id}, installation_id={self.installation_id}, access={self.access_level})>"

