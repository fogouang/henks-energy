"""Background scheduler for periodic tasks."""
import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from backend.services.epex_service import fetch_and_store_prices
from backend.services.sunshine_service import fetch_and_store_sunshine

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


def setup_scheduler() -> AsyncIOScheduler:
    """Configure and return the scheduler with all jobs."""

    # EPEX prices: every hour, the service itself decides if it should fetch
    scheduler.add_job(
        fetch_and_store_prices,
        trigger=CronTrigger(minute=0),  # every hour at :00
        id="epex_prices",
        name="Fetch EPEX electricity prices",
        replace_existing=True,
        misfire_grace_time=300,
    )

    # Sunshine forecast: 4 times a day at 1, 7, 13, 19 (UTC)
    scheduler.add_job(
        fetch_and_store_sunshine,
        trigger=CronTrigger(hour="1,7,13,19", minute=0),
        id="sunshine_forecast",
        name="Fetch sunshine forecast",
        replace_existing=True,
        misfire_grace_time=300,
    )

    logger.info("Scheduler configured with EPEX and sunshine jobs.")
    return scheduler