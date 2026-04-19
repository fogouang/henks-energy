"""Database configuration and session management."""
import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.exc import OperationalError

from backend.config import settings
from backend.models.base import Base

logger = logging.getLogger(__name__)

# Create async engine with connection pool settings
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False, #settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,  # Test connections before using them
    pool_recycle=3600,   # Recycle connections after 1 hour
    pool_size=10,        # Number of connections to maintain
    max_overflow=20,     # Maximum overflow connections
    connect_args={
        "server_settings": {
            "application_name": "jsenergy_backend",
        },
        "command_timeout": 60,
        "timeout": 10,  # Connection timeout in seconds
    },
)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncSession:
    """Dependency for getting database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database (create tables) with retry logic for recovery mode."""
    max_retries = 10
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database initialized successfully")
            return
        except OperationalError as e:
            error_msg = str(e).lower()
            if "recovery" in error_msg or "notconnectnow" in error_msg:
                if attempt < max_retries - 1:
                    wait_time = retry_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(
                        f"Database is in recovery mode (attempt {attempt + 1}/{max_retries}). "
                        f"Retrying in {wait_time} seconds..."
                    )
                    await asyncio.sleep(wait_time)
                    continue
                else:
                    logger.error("Database recovery mode timeout. Max retries reached.")
                    raise
            else:
                # Different error, re-raise immediately
                raise
        except Exception as e:
            logger.error(f"Database initialization error: {e}")
            raise


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()

