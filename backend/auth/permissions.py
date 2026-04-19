"""Permission checking utilities."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.installation import Installation
from backend.models.user import AccessLevel, User, UserInstallation


async def check_installation_access(
    db: AsyncSession,
    user: User,
    installation_id: int,
    required_level: AccessLevel = AccessLevel.VIEW,
) -> bool:
    """Check if user has access to installation."""
    from backend.models.user import UserRole
    
    # Admins have full access
    if user.role == UserRole.ADMIN:
        return True
    
    # Check user-installation access
    result = await db.execute(
        select(UserInstallation).where(
            UserInstallation.user_id == user.id,
            UserInstallation.installation_id == installation_id,
            UserInstallation.deleted_at.is_(None),
            UserInstallation.expires_at.is_(None) | (UserInstallation.expires_at > datetime.now(timezone.utc)),
        )
    )
    user_installation = result.scalar_one_or_none()
    
    if user_installation is None:
        return False
    
    # Check access level
    level_map = {
        AccessLevel.VIEW: 1,
        AccessLevel.CONFIGURE: 2,
        AccessLevel.ADMIN: 3,
    }
    
    user_level = level_map.get(user_installation.access_level, 0)
    required_level_value = level_map.get(required_level, 0)
    
    return user_level >= required_level_value


async def get_user_installations(
    db: AsyncSession,
    user: User,
) -> list[Installation]:
    """Get all installations accessible to user."""
    from backend.models.user import UserRole
    from sqlalchemy import select
    
    # Admins see installations that have at least one active (non-deleted) user
    # so orphaned installations (e.g. from users deleted before cleanup existed) are hidden
    if user.role == UserRole.ADMIN:
        result = await db.execute(
            select(Installation)
            .join(
                UserInstallation,
                (UserInstallation.installation_id == Installation.id)
                & (UserInstallation.deleted_at.is_(None)),
            )
            .join(
                User,
                (User.id == UserInstallation.user_id) & (User.deleted_at.is_(None)),
            )
            .where(Installation.deleted_at.is_(None))
            .distinct()
        )
        return list(result.scalars().all())
    
    # Get installations from user_installations
    result = await db.execute(
        select(Installation)
        .join(UserInstallation)
        .where(
            UserInstallation.user_id == user.id,
            UserInstallation.deleted_at.is_(None),
            Installation.deleted_at.is_(None),
            UserInstallation.expires_at.is_(None) | (UserInstallation.expires_at > datetime.now(timezone.utc)),
        )
    )
    return list(result.scalars().all())


async def check_admin_only(user: User) -> bool:
    """Check if user is admin."""
    from backend.models.user import UserRole
    return user.role == UserRole.ADMIN


async def check_user_access(
    db: AsyncSession,
    current_user: User,
    target_user_id: int,
) -> bool:
    """Check if admin or accessing own user."""
    from backend.models.user import UserRole
    return current_user.role == UserRole.ADMIN or current_user.id == target_user_id

