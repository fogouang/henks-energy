"""Edge device authentication."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Header, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.edge_device import EdgeDevice
from backend.models.installation import Installation


async def get_device_token(
    x_device_token: Annotated[str | None, Header(alias="X-Device-Token")] = None,
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Extract device token from headers."""
    # Try X-Device-Token header first
    if x_device_token:
        return x_device_token
    
    # Try Authorization: Device <token> header
    if authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "device":
            return parts[1]
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Device token required. Provide X-Device-Token header or Authorization: Device <token>",
    )


async def get_edge_device_from_token(
    token: Annotated[str, Depends(get_device_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EdgeDevice:
    """Authenticate edge device by token and return device with installation."""
    # Query for active device with matching token
    result = await db.execute(
        select(EdgeDevice)
        .where(
            EdgeDevice.token == token,
            EdgeDevice.is_active == True,
            EdgeDevice.deleted_at.is_(None),
        )
        .join(Installation)
        .where(Installation.deleted_at.is_(None))  # Also check installation is not deleted
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive device token",
        )
    
    # Update last_seen_at timestamp
    device.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    
    return device

