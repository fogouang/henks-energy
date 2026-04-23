"""EPEX spot price service - fetches and stores electricity prices."""
import logging
from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal as async_session_maker

logger = logging.getLogger(__name__)

EPEX_API_URL = (
    "https://www.energyforecast.de/api/v1/predictions/next_48_hours"
    "?fixed_cost_cent=0&vat=0&market_zone=NL&token=85cd0854c6971a54334dfeb428"
)

# Dutch timezone offset (CET=+1, CEST=+2 in summer)
DUTCH_TZ = timezone(timedelta(hours=1))  # will handle DST below


def get_dutch_now() -> datetime:
    """Return current datetime in Dutch local time (handles DST)."""
    import pytz
    dutch_tz = pytz.timezone("Europe/Amsterdam")
    return datetime.now(dutch_tz)


async def should_fetch_prices() -> bool:
    """
    Check if we should fetch prices:
    - If current Dutch hour < 13: do nothing
    - If last record is from today: do nothing
    - Otherwise: fetch
    """
    now_dutch = get_dutch_now()

    if now_dutch.hour < 13:
        logger.info("EPEX: Before 13h Dutch time, skipping fetch.")
        return False

    async with async_session_maker() as session:
        result = await session.execute(
            text("SELECT MAX(date_hour) FROM epex_spot_prices")
        )
        last_date_hour = result.scalar()

        if last_date_hour is not None:
            # Make timezone-aware if needed
            if last_date_hour.tzinfo is None:
                last_date_hour = last_date_hour.replace(tzinfo=timezone.utc)
            last_date_hour_dutch = last_date_hour.astimezone(
                get_dutch_now().tzinfo
            )
            if last_date_hour_dutch.date() == now_dutch.date():
                logger.info("EPEX: Prices already fetched today, skipping.")
                return False

    return True


async def fetch_and_store_prices() -> None:
    """Fetch EPEX prices from API and upsert into database."""
    if not await should_fetch_prices():
        return

    logger.info("EPEX: Fetching prices from energyforecast.de...")

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(EPEX_API_URL)
            response.raise_for_status()
            entries = response.json()
    except Exception as e:
        logger.error(f"EPEX: Failed to fetch prices: {e}")
        return

    if not entries:
        logger.warning("EPEX: No price data returned from API.")
        return

    count = 0
    async with async_session_maker() as session:
        async with session.begin():
            for entry in entries:
                try:
                    raw_time = entry.get("start")
                    price = entry.get("price")

                    if raw_time is None or price is None:
                        continue

                    from dateutil import parser as dateutil_parser
                    date_hour_utc = dateutil_parser.parse(raw_time).astimezone(timezone.utc)

                    await session.execute(
                        text("""
                            INSERT INTO epex_spot_prices (date_hour, price, created_at, updated_at)
                            VALUES (:date_hour, :price, NOW(), NOW())
                            ON CONFLICT (date_hour)
                            DO UPDATE SET price = EXCLUDED.price, updated_at = NOW()
                        """),
                        {"date_hour": date_hour_utc, "price": float(price)},
                    )
                    count += 1
                except Exception as e:
                    logger.error(f"EPEX: Error processing entry {entry}: {e}")
                    continue

    logger.info(f"EPEX: Successfully stored {count} price entries.")