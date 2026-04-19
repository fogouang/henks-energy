"""Authentication schemas."""
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from backend.models.user import AccessLevel, UserRole


class LoginRequest(BaseModel):
    """Schema for login request."""

    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""

    refresh_token: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    role: UserRole = Field(default=UserRole.CUSTOMER)
    is_active: bool = Field(default=True)
    full_name: str | None = None
    phone: str | None = None
    language_preference: str = Field(default="nl", max_length=10)


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str = Field(..., min_length=12)


class UserUpdate(BaseModel):
    """Schema for updating a user."""

    email: EmailStr | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    full_name: str | None = None
    phone: str | None = None
    language_preference: str | None = Field(None, max_length=10)
    password: str | None = Field(None, min_length=12, description="New password (min 12 characters)")


class UserResponse(UserBase):
    """Schema for user response."""

    id: int
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    class Config:
        from_attributes = True

