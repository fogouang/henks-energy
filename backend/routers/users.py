"""User management routes (admin only)."""
import secrets
import string
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import get_current_admin_user, get_current_user
from backend.auth.password import hash_password
from backend.database import get_db
from backend.models.installation import Installation
from backend.models.user import User, UserInstallation, UserRole
from backend.schemas.auth import UserResponse, UserUpdate
from backend.schemas.user import UserCreate, UserCredentialsResponse, UserListResponse
from backend.schemas.installation import InstallationList

router = APIRouter(prefix="/users", tags=["users"])


def generate_random_password(length: int = 16) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    password = ''.join(secrets.choice(alphabet) for _ in range(length))
    return password


@router.get("", response_model=UserListResponse)
async def list_users(
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    role: UserRole | None = None,
    is_active: bool | None = None,
    include_deleted: bool = False,
):
    """List all users (admin only). Optionally include soft-deleted users."""
    query = select(User)
    if not include_deleted:
        query = query.where(User.deleted_at.is_(None))

    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        users=[UserResponse.model_validate(u) for u in users],
        total=len(users),
    )


@router.get("/{user_id}/installations", response_model=InstallationList)
async def get_user_installations(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get all installations for a specific user (admin only)."""
    from backend.models.installation import Installation
    from backend.models.user import UserInstallation
    from backend.schemas.installation import InstallationList, InstallationResponse
    from backend.auth.permissions import AccessLevel
    
    # Verify user exists
    user_result = await db.execute(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Get all installations for this user
    result = await db.execute(
        select(Installation)
        .join(UserInstallation)
        .where(
            UserInstallation.user_id == user_id,
            Installation.deleted_at.is_(None),
        )
    )
    installations = result.scalars().all()
    
    # Build response
    installation_responses = []
    for installation in installations:
        installation_response = InstallationResponse.model_validate(installation)
        installation_response.owner_email = target_user.email
        installation_responses.append(installation_response)
    
    return InstallationList(installations=installation_responses, total=len(installation_responses))


@router.post("", response_model=UserCredentialsResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new user account (admin only)."""
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    
    # Generate password if not provided
    password = user_data.password
    if not password:
        password = generate_random_password()
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(password),
        role=user_data.role,
        is_active=user_data.is_active,
        full_name=user_data.full_name,
        phone=user_data.phone,
        language_preference=user_data.language_preference,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    # Return credentials (only shown once)
    return UserCredentialsResponse(
        email=user.email,
        password=password,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get user details (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update user (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update fields
    if user_data.email is not None:
        # Check if email is already taken by another user
        email_check = await db.execute(
            select(User).where(User.email == user_data.email, User.id != user_id)
        )
        if email_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        user.email = user_data.email
    
    if user_data.role is not None:
        user.role = user_data.role
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    if user_data.full_name is not None:
        user.full_name = user_data.full_name
    if user_data.phone is not None:
        user.phone = user_data.phone
    if user_data.language_preference is not None:
        user.language_preference = user_data.language_preference
    if user_data.password is not None:
        # Update password
        user.password_hash = hash_password(user_data.password)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/activate", response_model=UserResponse)
async def activate_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Activate a user (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    user.is_active = True
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.patch("/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deactivate a user (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent deactivating yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself",
        )
    
    user.is_active = False
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Soft delete a user (admin only)."""
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Prevent deleting yourself
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )
    
    # Soft delete user
    now = datetime.now(timezone.utc)
    user.deleted_at = now
    user.is_active = False

    # Soft-delete all UserInstallation records for this user
    ui_result = await db.execute(
        select(UserInstallation).where(
            UserInstallation.user_id == user_id,
            UserInstallation.deleted_at.is_(None),
        )
    )
    user_installations = ui_result.scalars().all()
    affected_installation_ids = [ui.installation_id for ui in user_installations]

    for ui in user_installations:
        ui.deleted_at = now

    # Soft-delete orphaned installations (no remaining active user associations)
    for inst_id in affected_installation_ids:
        remaining_result = await db.execute(
            select(UserInstallation).where(
                UserInstallation.installation_id == inst_id,
                UserInstallation.user_id != user_id,
                UserInstallation.deleted_at.is_(None),
            )
        )
        if remaining_result.scalar_one_or_none() is None:
            inst_result = await db.execute(
                select(Installation).where(Installation.id == inst_id)
            )
            installation = inst_result.scalar_one_or_none()
            if installation:
                installation.deleted_at = now

    await db.commit()

