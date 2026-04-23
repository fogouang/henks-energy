"""Sunshine forecast service - fetches and stores solar radiation data."""
import json
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal as async_session_maker
from backend.models.system_settings import SystemSetting

logger = logging.getLogger(__name__)

SUNSHINE_API_URL = (
    "https://api.open-meteo.com/v1/forecast"
    "?latitude=51.47&longitude=6.72&hourly=sunshine_duration"
    "&cell_selection=nearest&forecast_hours=28"
)

SUNSHINE_KEY = "sunshine_expectation"


async def fetch_and_store_sunshine() -> None:
    """Fetch sunshine forecast and store as JSON in system_settings."""
    logger.info("Sunshine: Fetching forecast from open-meteo...")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(SUNSHINE_API_URL)
            response.raise_for_status()
            data = response.json()
    except Exception as e:
        logger.error(f"Sunshine: Failed to fetch forecast: {e}")
        return

    async with async_session_maker() as session:
        async with session.begin():
            result = await session.execute(
                select(SystemSetting).where(SystemSetting.key == SUNSHINE_KEY)
            )
            setting = result.scalar_one_or_none()

            if setting:
                setting.value = json.dumps(data)
            else:
                session.add(
                    SystemSetting(
                        key=SUNSHINE_KEY,
                        value=json.dumps(data),
                        description="Hourly sunshine duration forecast from open-meteo",
                    )
                )

    logger.info("Sunshine: Forecast stored successfully.")