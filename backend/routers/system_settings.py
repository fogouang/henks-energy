"""System settings routes (Admin only)."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import get_current_user
from backend.config import settings as env_settings
from backend.database import get_db
from backend.models.system_settings import SystemSetting
from backend.models.user import User
from backend.schemas.system_settings import (
    ReverseSSHSettingsResponse,
    ReverseSSHSettingsUpdate,
    SystemSettingResponse,
    SystemSettingsList,
)

router = APIRouter(prefix="/system-settings", tags=["system-settings"])


def require_admin(user: User) -> None:
    """Require user to be admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


async def get_setting(db: AsyncSession, key: str) -> SystemSetting | None:
    """Get a system setting by key."""
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == key)
    )
    return result.scalar_one_or_none()


async def set_setting(db: AsyncSession, key: str, value: str, description: str | None = None) -> SystemSetting:
    """Create or update a system setting."""
    existing = await get_setting(db, key)
    
    if existing:
        existing.value = value
        if description is not None:
            existing.description = description
        await db.commit()
        await db.refresh(existing)
        return existing
    else:
        setting = SystemSetting(key=key, value=value, description=description)
        db.add(setting)
        await db.commit()
        await db.refresh(setting)
        return setting


@router.get("", response_model=SystemSettingsList)
async def list_system_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all system settings (Admin only)."""
    require_admin(current_user)
    
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    
    return SystemSettingsList(
        settings=[SystemSettingResponse.model_validate(s) for s in settings],
        total=len(settings),
    )


@router.get("/reverse-ssh", response_model=ReverseSSHSettingsResponse)
async def get_reverse_ssh_settings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get reverse SSH settings (Admin only).
    
    Returns database values if set, otherwise falls back to environment variables.
    """
    require_admin(current_user)
    
    # Get settings from database, fall back to env vars
    host_setting = await get_setting(db, "REVERSE_SSH_HOST")
    user_setting = await get_setting(db, "REVERSE_SSH_USER")
    port_setting = await get_setting(db, "REVERSE_SSH_PORT")
    
    return ReverseSSHSettingsResponse(
        host=host_setting.value if host_setting else env_settings.REVERSE_SSH_HOST,
        user=user_setting.value if user_setting else env_settings.REVERSE_SSH_USER,
        port=int(port_setting.value) if port_setting else env_settings.REVERSE_SSH_PORT,
    )


@router.put("/reverse-ssh", response_model=ReverseSSHSettingsResponse)
async def update_reverse_ssh_settings(
    settings_data: ReverseSSHSettingsUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update reverse SSH settings (Admin only).
    
    These settings override environment variables.
    """
    require_admin(current_user)
    
    # Update all three settings
    await set_setting(
        db, 
        "REVERSE_SSH_HOST", 
        settings_data.host, 
        "SSH server hostname for reverse SSH tunnels"
    )
    await set_setting(
        db, 
        "REVERSE_SSH_USER", 
        settings_data.user, 
        "SSH username for reverse SSH tunnels"
    )
    await set_setting(
        db, 
        "REVERSE_SSH_PORT", 
        str(settings_data.port), 
        "SSH server port for reverse SSH tunnels"
    )
    
    return ReverseSSHSettingsResponse(
        host=settings_data.host,
        user=settings_data.user,
        port=settings_data.port,
    )


# Helper function to get effective reverse SSH settings (used by other modules)
async def get_effective_reverse_ssh_settings(db: AsyncSession) -> dict:
    """Get effective reverse SSH settings (DB overrides env vars)."""
    host_setting = await get_setting(db, "REVERSE_SSH_HOST")
    user_setting = await get_setting(db, "REVERSE_SSH_USER")
    port_setting = await get_setting(db, "REVERSE_SSH_PORT")
    
    return {
        "host": host_setting.value if host_setting else env_settings.REVERSE_SSH_HOST,
        "user": user_setting.value if user_setting else env_settings.REVERSE_SSH_USER,
        "port": int(port_setting.value) if port_setting else env_settings.REVERSE_SSH_PORT,
    }

