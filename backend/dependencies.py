"""Dependency injection for FastAPI routes."""
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.middleware import get_current_user
from backend.config import settings
from backend.database import get_db
from backend.models.user import User


async def get_db_session() -> AsyncSession:
    """Get database session."""
    async for session in get_db():
        yield session


async def get_current_active_user(
    current_user: User = None,
) -> User:
    """Get current active user (dependency)."""
    if current_user is None:
        current_user = await get_current_user()
    if not current_user.is_active:
        raise ValueError("User is not active")
    return current_user


def check_feature_flag(flag_name: str) -> bool:
    """Check if a feature flag is enabled."""
    flag_map = {
        "mvp_mode": settings.ENABLE_MVP_MODE,
        "multi_tenant": settings.ENABLE_MULTI_TENANT,
        "generator": settings.ENABLE_GENERATOR,
        "ev_chargers": settings.ENABLE_EV_CHARGERS,
        "revenue_analytics": settings.ENABLE_REVENUE_ANALYTICS,
    }
    return flag_map.get(flag_name, False)

