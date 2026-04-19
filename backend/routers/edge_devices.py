"""Edge device routes."""
import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.device_auth import get_edge_device_from_token
from backend.auth.middleware import get_current_user
from backend.auth.permissions import check_installation_access
from backend.config import settings
from backend.database import get_db
from backend.models.edge_device import EdgeDevice
from backend.models.installation import Installation
from backend.models.reverse_ssh import ReverseSSH
from backend.models.system_settings import SystemSetting
from backend.models.user import User
from backend.schemas.edge_device import (
    EdgeDeviceCreate,
    EdgeDeviceList,
    EdgeDeviceListResponse,
    EdgeDeviceProvisionResponse,
    EdgeDeviceResponse,
    EdgeDeviceUpdate,
)
from backend.schemas.reverse_ssh import (
    ReverseSSHCreate,
    ReverseSSHResponse,
    ReverseSSHUpdate,
)

router = APIRouter(prefix="/installations", tags=["edge-devices"])


async def get_reverse_ssh_settings(db: AsyncSession) -> dict:
    """Get effective reverse SSH settings (DB overrides env vars)."""
    result = await db.execute(
        select(SystemSetting).where(
            SystemSetting.key.in_(["REVERSE_SSH_HOST", "REVERSE_SSH_USER", "REVERSE_SSH_PORT"])
        )
    )
    db_settings = {s.key: s.value for s in result.scalars().all()}
    
    return {
        "host": db_settings.get("REVERSE_SSH_HOST", settings.REVERSE_SSH_HOST),
        "user": db_settings.get("REVERSE_SSH_USER", settings.REVERSE_SSH_USER),
        "port": int(db_settings.get("REVERSE_SSH_PORT", settings.REVERSE_SSH_PORT)),
    }


@router.get("/{installation_id}/edge-devices", response_model=EdgeDeviceList)
async def list_edge_devices(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all edge devices for an installation."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Verify installation exists
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Get devices with reverse SSH relationship eager-loaded
    result = await db.execute(
        select(EdgeDevice)
        .options(selectinload(EdgeDevice.reverse_ssh))
        .where(
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    devices = result.scalars().all()
    
    # Build response with reverse_ssh_enabled field (defaults to False if no config)
    device_responses = []
    for d in devices:
        device_dict = {
            "id": d.id,
            "installation_id": d.installation_id,
            "name": d.name,
            "description": d.description,
            "is_active": d.is_active,
            "last_seen_at": d.last_seen_at,
            "created_at": d.created_at,
            "updated_at": d.updated_at,
            "reverse_ssh_enabled": d.reverse_ssh.enabled if d.reverse_ssh and d.reverse_ssh.deleted_at is None else False,
        }
        device_responses.append(EdgeDeviceListResponse(**device_dict))
    
    return EdgeDeviceList(
        devices=device_responses,
        total=len(devices),
    )


@router.get("/{installation_id}/device", response_model=EdgeDeviceListResponse)
async def get_installation_device(
    installation_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get device details for an installation.
    
    **Authentication:** Requires X-Device-Token header (device token authentication).
    The device token must match the installation_id in the URL path.
    """
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Get device with reverse SSH relationship eager-loaded
    result = await db.execute(
        select(EdgeDevice)
        .options(selectinload(EdgeDevice.reverse_ssh))
        .where(
            EdgeDevice.id == device.id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    # Build response with reverse_ssh_enabled field (defaults to False if no config)
    return EdgeDeviceListResponse(
        id=device.id,
        installation_id=device.installation_id,
        name=device.name,
        description=device.description,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        updated_at=device.updated_at,
        reverse_ssh_enabled=device.reverse_ssh.enabled if device.reverse_ssh and device.reverse_ssh.deleted_at is None else False,
    )


@router.post("/{installation_id}/edge-devices", response_model=EdgeDeviceResponse, status_code=status.HTTP_201_CREATED)
async def create_edge_device(
    installation_id: int,
    device_data: EdgeDeviceCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Register a new edge device."""
    # Validate installation_id matches request body
    if device_data.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Installation ID mismatch",
        )
    
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Verify installation exists
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    
    # Create device
    device = EdgeDevice(
        installation_id=installation_id,
        name=device_data.name,
        token=token,
        description=device_data.description,
        is_active=True,
    )
    
    db.add(device)
    await db.commit()
    await db.refresh(device)
    
    # Return device with token (only shown once)
    return EdgeDeviceResponse(
        id=device.id,
        device_id=device.id,
        installation_id=device.installation_id,
        name=device.name,
        token=device.token,  # Include token only on creation
        description=device.description,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


@router.get("/{installation_id}/edge-devices/{device_id}", response_model=EdgeDeviceListResponse)
async def get_edge_device(
    installation_id: int,
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get edge device details (without token)."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device with reverse SSH relationship eager-loaded
    result = await db.execute(
        select(EdgeDevice)
        .options(selectinload(EdgeDevice.reverse_ssh))
        .where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    # Build response with reverse_ssh_enabled field (defaults to False if no config)
    return EdgeDeviceListResponse(
        id=device.id,
        installation_id=device.installation_id,
        name=device.name,
        description=device.description,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        updated_at=device.updated_at,
        reverse_ssh_enabled=device.reverse_ssh.enabled if device.reverse_ssh and device.reverse_ssh.deleted_at is None else False,
    )


@router.patch("/{installation_id}/edge-devices/{device_id}", response_model=EdgeDeviceListResponse)
async def update_edge_device(
    installation_id: int,
    device_id: int,
    device_data: EdgeDeviceUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update edge device."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device
    result = await db.execute(
        select(EdgeDevice).where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    # Update fields
    if device_data.name is not None:
        device.name = device_data.name
    if device_data.description is not None:
        device.description = device_data.description
    if device_data.is_active is not None:
        device.is_active = device_data.is_active
    
    await db.commit()
    await db.refresh(device)
    
    return EdgeDeviceListResponse.model_validate(device)


@router.delete("/{installation_id}/edge-devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_edge_device(
    installation_id: int,
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete edge device (soft delete)."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device
    result = await db.execute(
        select(EdgeDevice).where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    # Soft delete
    from datetime import datetime, timezone
    device.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.post("/{installation_id}/edge-devices/{device_id}/regenerate-token", response_model=EdgeDeviceResponse)
async def regenerate_device_token(
    installation_id: int,
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Regenerate device token (returns new token once)."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device
    result = await db.execute(
        select(EdgeDevice).where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    # Generate new token
    new_token = secrets.token_urlsafe(32)
    device.token = new_token
    
    await db.commit()
    await db.refresh(device)
    
    # Return device with new token (only shown once)
    return EdgeDeviceResponse(
        id=device.id,
        device_id=device.id,
        installation_id=device.installation_id,
        name=device.name,
        token=device.token,  # Include token only on regeneration
        description=device.description,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        updated_at=device.updated_at,
    )


@router.patch("/{installation_id}/edge-devices/{device_id}/activate", response_model=EdgeDeviceListResponse)
async def activate_edge_device(
    installation_id: int,
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Activate edge device."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device
    result = await db.execute(
        select(EdgeDevice).where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    device.is_active = True
    await db.commit()
    await db.refresh(device)
    
    return EdgeDeviceListResponse.model_validate(device)


@router.patch("/{installation_id}/edge-devices/{device_id}/deactivate", response_model=EdgeDeviceListResponse)
async def deactivate_edge_device(
    installation_id: int,
    device_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deactivate edge device."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device
    result = await db.execute(
        select(EdgeDevice).where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    device.is_active = False
    await db.commit()
    await db.refresh(device)
    
    return EdgeDeviceListResponse.model_validate(device)


@router.patch("/{installation_id}/edge-devices/{device_id}/reverse-ssh/toggle", response_model=EdgeDeviceListResponse)
async def toggle_reverse_ssh(
    installation_id: int,
    device_id: int,
    enabled: bool,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Toggle reverse SSH enabled state for an edge device.
    
    **Authentication:** Requires JWT token (user authentication).
    
    If no reverse SSH configuration exists and enabling, auto-creates one with systemwide defaults.
    If no configuration exists and disabling, returns success (already disabled by default).
    
    Args:
        enabled: The new enabled state for reverse SSH
    """
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get device with reverse SSH relationship
    result = await db.execute(
        select(EdgeDevice)
        .options(selectinload(EdgeDevice.reverse_ssh))
        .where(
            EdgeDevice.id == device_id,
            EdgeDevice.installation_id == installation_id,
            EdgeDevice.deleted_at.is_(None),
        )
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge device not found",
        )
    
    # Check if reverse SSH config exists
    if not device.reverse_ssh or device.reverse_ssh.deleted_at is not None:
        if enabled:
            # Get effective settings (DB overrides env vars)
            ssh_settings = await get_reverse_ssh_settings(db)
            # Auto-create config with systemwide defaults when enabling
            reverse_ssh = ReverseSSH(
                device_id=device_id,
                enabled=True,
                host=None,  # Uses systemwide default
                user=None,  # Uses systemwide default
                ssh_port=ssh_settings["port"],
            )
            db.add(reverse_ssh)
            await db.commit()
            await db.refresh(device)
            # Re-fetch to get the relationship
            result = await db.execute(
                select(EdgeDevice)
                .options(selectinload(EdgeDevice.reverse_ssh))
                .where(EdgeDevice.id == device_id)
            )
            device = result.scalar_one()
        else:
            # Disabling and no config exists - return success (already disabled by default)
            return EdgeDeviceListResponse(
                id=device.id,
                installation_id=device.installation_id,
                name=device.name,
                description=device.description,
                is_active=device.is_active,
                last_seen_at=device.last_seen_at,
                created_at=device.created_at,
                updated_at=device.updated_at,
                reverse_ssh_enabled=False,
            )
    else:
        # Update the enabled state on existing config
        device.reverse_ssh.enabled = enabled
        await db.commit()
        await db.refresh(device)
        await db.refresh(device.reverse_ssh)
    
    # Return updated device response
    return EdgeDeviceListResponse(
        id=device.id,
        installation_id=device.installation_id,
        name=device.name,
        description=device.description,
        is_active=device.is_active,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        updated_at=device.updated_at,
        reverse_ssh_enabled=device.reverse_ssh.enabled,
    )


@router.get("/{installation_id}/edge-devices/{device_id}/reverse-ssh", response_model=ReverseSSHResponse)
async def get_reverse_ssh(
    installation_id: int,
    device_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get reverse SSH configuration for an edge device.
    
    **Authentication:** Requires X-Device-Token header (device token authentication).
    
    Returns default configuration (enabled=false) if no config exists in database.
    Uses systemwide hostname/user from config when not set in database.
    """
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Validate device_id matches authenticated device
    if device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device ID mismatch",
        )
    
    # Refresh device to ensure all attributes are loaded (needed after commit in auth)
    await db.refresh(device)
    
    # Get reverse SSH config
    result = await db.execute(
        select(ReverseSSH).where(
            ReverseSSH.device_id == device_id,
            ReverseSSH.deleted_at.is_(None),
        )
    )
    reverse_ssh = result.scalar_one_or_none()
    
    # Get effective settings (DB overrides env vars)
    ssh_settings = await get_reverse_ssh_settings(db)
    
    if not reverse_ssh:
        # Return default configuration (disabled) with systemwide settings
        return ReverseSSHResponse(
            id=None,
            device_id=device_id,
            enabled=False,
            host=ssh_settings["host"],
            user=ssh_settings["user"],
            ssh_port=ssh_settings["port"],
            created_at=None,
            updated_at=None,
        )
    
    # Return config with systemwide defaults for null fields
    return ReverseSSHResponse(
        id=reverse_ssh.id,
        device_id=reverse_ssh.device_id,
        enabled=reverse_ssh.enabled,
        host=reverse_ssh.host or ssh_settings["host"],
        user=reverse_ssh.user or ssh_settings["user"],
        ssh_port=reverse_ssh.ssh_port,
        created_at=reverse_ssh.created_at,
        updated_at=reverse_ssh.updated_at,
    )


@router.post("/{installation_id}/edge-devices/{device_id}/reverse-ssh", response_model=ReverseSSHResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_reverse_ssh(
    installation_id: int,
    device_id: int,
    config_data: ReverseSSHCreate,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create or update reverse SSH configuration for an edge device.
    
    **Authentication:** Requires X-Device-Token header (device token authentication).
    
    Host and user default to systemwide config if not provided.
    """
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Validate device_id matches authenticated device
    if device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device ID mismatch",
        )
    
    # Refresh device to ensure all attributes are loaded (needed after commit in auth)
    await db.refresh(device)
    
    # Check if reverse SSH config already exists
    result = await db.execute(
        select(ReverseSSH).where(
            ReverseSSH.device_id == device_id,
            ReverseSSH.deleted_at.is_(None),
        )
    )
    existing_config = result.scalar_one_or_none()
    
    # Get effective settings (DB overrides env vars)
    ssh_settings = await get_reverse_ssh_settings(db)
    
    if existing_config:
        # Update existing config
        existing_config.enabled = config_data.enabled
        existing_config.host = config_data.host  # Can be None (uses systemwide default)
        existing_config.user = config_data.user  # Can be None (uses systemwide default)
        existing_config.ssh_port = config_data.ssh_port
        
        await db.commit()
        await db.refresh(existing_config)
        
        # Return with systemwide defaults for null fields
        return ReverseSSHResponse(
            id=existing_config.id,
            device_id=existing_config.device_id,
            enabled=existing_config.enabled,
            host=existing_config.host or ssh_settings["host"],
            user=existing_config.user or ssh_settings["user"],
            ssh_port=existing_config.ssh_port,
            created_at=existing_config.created_at,
            updated_at=existing_config.updated_at,
        )
    else:
        # Create new config
        reverse_ssh = ReverseSSH(
            device_id=device_id,
            enabled=config_data.enabled,
            host=config_data.host,  # Can be None (uses systemwide default)
            user=config_data.user,  # Can be None (uses systemwide default)
            ssh_port=config_data.ssh_port,
        )
        
        db.add(reverse_ssh)
        await db.commit()
        await db.refresh(reverse_ssh)
        
        # Return with systemwide defaults for null fields
        return ReverseSSHResponse(
            id=reverse_ssh.id,
            device_id=reverse_ssh.device_id,
            enabled=reverse_ssh.enabled,
            host=reverse_ssh.host or ssh_settings["host"],
            user=reverse_ssh.user or ssh_settings["user"],
            ssh_port=reverse_ssh.ssh_port,
            created_at=reverse_ssh.created_at,
            updated_at=reverse_ssh.updated_at,
        )


@router.patch("/{installation_id}/edge-devices/{device_id}/reverse-ssh", response_model=ReverseSSHResponse)
async def update_reverse_ssh(
    installation_id: int,
    device_id: int,
    config_data: ReverseSSHUpdate,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update reverse SSH configuration for an edge device.
    
    **Authentication:** Requires X-Device-Token header (device token authentication).
    """
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Validate device_id matches authenticated device
    if device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device ID mismatch",
        )
    
    # Refresh device to ensure all attributes are loaded (needed after commit in auth)
    await db.refresh(device)
    
    # Get reverse SSH config
    result = await db.execute(
        select(ReverseSSH).where(
            ReverseSSH.device_id == device_id,
            ReverseSSH.deleted_at.is_(None),
        )
    )
    reverse_ssh = result.scalar_one_or_none()
    
    if not reverse_ssh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reverse SSH configuration not found",
        )
    
    # Update fields
    if config_data.enabled is not None:
        reverse_ssh.enabled = config_data.enabled
    if config_data.host is not None:
        reverse_ssh.host = config_data.host
    if config_data.user is not None:
        reverse_ssh.user = config_data.user
    if config_data.ssh_port is not None:
        reverse_ssh.ssh_port = config_data.ssh_port
    
    await db.commit()
    await db.refresh(reverse_ssh)
    
    # Get effective settings (DB overrides env vars)
    ssh_settings = await get_reverse_ssh_settings(db)
    
    # Return with systemwide defaults for null fields
    return ReverseSSHResponse(
        id=reverse_ssh.id,
        device_id=reverse_ssh.device_id,
        enabled=reverse_ssh.enabled,
        host=reverse_ssh.host or ssh_settings["host"],
        user=reverse_ssh.user or ssh_settings["user"],
        ssh_port=reverse_ssh.ssh_port,
        created_at=reverse_ssh.created_at,
        updated_at=reverse_ssh.updated_at,
    )


@router.delete("/{installation_id}/edge-devices/{device_id}/reverse-ssh", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reverse_ssh(
    installation_id: int,
    device_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete reverse SSH configuration for an edge device (soft delete).
    
    **Authentication:** Requires X-Device-Token header (device token authentication).
    """
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Validate device_id matches authenticated device
    if device.id != device_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device ID mismatch",
        )
    
    # Refresh device to ensure all attributes are loaded (needed after commit in auth)
    await db.refresh(device)
    
    # Get reverse SSH config
    result = await db.execute(
        select(ReverseSSH).where(
            ReverseSSH.device_id == device_id,
            ReverseSSH.deleted_at.is_(None),
        )
    )
    reverse_ssh = result.scalar_one_or_none()
    
    if not reverse_ssh:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reverse SSH configuration not found",
        )
    
    # Soft delete
    from datetime import datetime, timezone
    reverse_ssh.deleted_at = datetime.now(timezone.utc)
    await db.commit()

