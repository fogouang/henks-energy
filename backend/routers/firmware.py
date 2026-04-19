"""Firmware management routes for admin and edge devices."""
import hashlib
import os
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.device_auth import get_edge_device_from_token
from backend.auth.middleware import get_current_admin_user
from backend.config import settings
from backend.database import get_db
from backend.models.edge_device import EdgeDevice
from backend.models.firmware import Firmware
from backend.models.user import User
from backend.schemas.firmware import (
    FirmwareLatestResponse,
    FirmwareList,
    FirmwareListResponse,
    FirmwareResponse,
)

# Admin router for firmware management
admin_router = APIRouter(prefix="/firmware", tags=["firmware-admin"])

# Device router for firmware updates
device_router = APIRouter(prefix="/device/firmware", tags=["firmware-device"])


def get_firmware_dir() -> Path:
    """Get the firmware upload directory, creating it if needed."""
    firmware_dir = Path(settings.FIRMWARE_UPLOAD_DIR)
    firmware_dir.mkdir(parents=True, exist_ok=True)
    return firmware_dir


def calculate_checksum(file_path: Path) -> str:
    """Calculate SHA256 checksum of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()


# =============================================================================
# Admin Endpoints (JWT auth, admin role required)
# =============================================================================


@admin_router.post("", response_model=FirmwareResponse, status_code=status.HTTP_201_CREATED)
async def upload_firmware(
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    file: UploadFile = File(..., description="Firmware ZIP file"),
    version: str = Form(..., max_length=50, description="Firmware version (e.g., '1.2.0')"),
    build_number: int = Form(..., ge=1, description="Build number"),
    release_notes: str | None = Form(None, description="Optional release notes"),
):
    """Upload a new firmware version (admin only)."""
    # Validate file type
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only ZIP files are allowed",
        )
    
    # Check if version + build_number combination already exists
    result = await db.execute(
        select(Firmware).where(
            Firmware.version == version,
            Firmware.build_number == build_number,
            Firmware.deleted_at.is_(None),
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Firmware version {version} build {build_number} already exists",
        )
    
    # Generate unique filename
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_filename = f"firmware_v{version}_b{build_number}_{timestamp}.zip"
    
    # Save file to disk
    firmware_dir = get_firmware_dir()
    file_path = firmware_dir / safe_filename
    
    try:
        # Save uploaded file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size and calculate checksum
        file_size = file_path.stat().st_size
        checksum = calculate_checksum(file_path)
        
        # Create database record
        firmware = Firmware(
            version=version,
            build_number=build_number,
            filename=safe_filename,
            file_path=str(file_path),
            file_size=file_size,
            checksum=checksum,
            release_notes=release_notes,
        )
        
        db.add(firmware)
        await db.commit()
        await db.refresh(firmware)
        
        return FirmwareResponse.model_validate(firmware)
        
    except Exception as e:
        # Clean up file if database operation fails
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save firmware: {str(e)}",
        )


@admin_router.get("", response_model=FirmwareList)
async def list_firmware(
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all firmware versions (admin only)."""
    result = await db.execute(
        select(Firmware)
        .where(Firmware.deleted_at.is_(None))
        .order_by(Firmware.created_at.desc())
    )
    firmware_list = result.scalars().all()
    
    return FirmwareList(
        firmware=[FirmwareListResponse.model_validate(fw) for fw in firmware_list],
        total=len(firmware_list),
    )


@admin_router.get("/{firmware_id}", response_model=FirmwareResponse)
async def get_firmware(
    firmware_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get firmware details (admin only)."""
    result = await db.execute(
        select(Firmware).where(
            Firmware.id == firmware_id,
            Firmware.deleted_at.is_(None),
        )
    )
    firmware = result.scalar_one_or_none()
    
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware not found",
        )
    
    return FirmwareResponse.model_validate(firmware)


@admin_router.delete("/{firmware_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_firmware(
    firmware_id: int,
    current_user: Annotated[User, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Delete firmware (soft delete, admin only)."""
    result = await db.execute(
        select(Firmware).where(
            Firmware.id == firmware_id,
            Firmware.deleted_at.is_(None),
        )
    )
    firmware = result.scalar_one_or_none()
    
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware not found",
        )
    
    # Soft delete
    firmware.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# =============================================================================
# Device Endpoints (device token auth)
# =============================================================================


@device_router.get("/latest", response_model=FirmwareLatestResponse)
async def get_latest_firmware(
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get latest firmware info (device auth required).
    
    Returns the latest firmware info with download URL.
    The device should compare version/build_number locally to decide if an update is needed.
    """
    # Get the latest firmware by created_at (newest first)
    result = await db.execute(
        select(Firmware)
        .where(Firmware.deleted_at.is_(None))
        .order_by(Firmware.created_at.desc())
        .limit(1)
    )
    latest_firmware = result.scalar_one_or_none()
    
    if not latest_firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No firmware available",
        )
    
    # Build download URL
    download_url = f"{settings.API_V1_PREFIX}/device/firmware/download/{latest_firmware.id}"
    
    return FirmwareLatestResponse(
        id=latest_firmware.id,
        version=latest_firmware.version,
        build_number=latest_firmware.build_number,
        file_size=latest_firmware.file_size,
        checksum=latest_firmware.checksum,
        release_notes=latest_firmware.release_notes,
        download_url=download_url,
        created_at=latest_firmware.created_at,
    )


@device_router.get("/download/{firmware_id}")
async def download_firmware(
    firmware_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Download firmware file (device auth required).
    
    Returns the firmware ZIP file as a streaming response.
    """
    result = await db.execute(
        select(Firmware).where(
            Firmware.id == firmware_id,
            Firmware.deleted_at.is_(None),
        )
    )
    firmware = result.scalar_one_or_none()
    
    if not firmware:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware not found",
        )
    
    file_path = Path(firmware.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Firmware file not found on server",
        )
    
    return FileResponse(
        path=file_path,
        filename=firmware.filename,
        media_type="application/zip",
        headers={
            "X-Firmware-Version": firmware.version,
            "X-Firmware-Build": str(firmware.build_number),
            "X-Firmware-Checksum": firmware.checksum,
        },
    )

