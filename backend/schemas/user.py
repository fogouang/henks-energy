"""User management schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, EmailStr, Field

from backend.models.user import UserRole
from backend.schemas.auth import UserBase, UserResponse


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str | None = Field(None, min_length=12, description="If not provided, a random password will be generated")


class UserCredentialsResponse(BaseModel):
    """Schema for user credentials (shown once on creation)."""

    email: str
    password: str
    message: str = "Save these credentials - the password will not be shown again"


class UserListResponse(BaseModel):
    """Schema for user list response."""

    users: List[UserResponse]
    total: int

