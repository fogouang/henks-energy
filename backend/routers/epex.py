"""EPEX spot price router."""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.epex import EPEXSpotPrice
from backend.schemas.epex import EPEXSpotPriceListResponse, EPEXSpotPriceResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/epex", tags=["EPEX Prices"])


@router.get("/prices", response_model=EPEXSpotPriceListResponse)
async def get_epex_prices(
    hours: int = Query(default=48, ge=1, le=168, description="Number of hours to retrieve"),
    db: AsyncSession = Depends(get_db),
):
    """Get EPEX spot prices for the next N hours."""
    from_dt = datetime.now(timezone.utc) - timedelta(hours=1)

    result = await db.execute(
        select(EPEXSpotPrice)
        .where(EPEXSpotPrice.date_hour >= from_dt)
        .order_by(EPEXSpotPrice.date_hour)
        .limit(hours)
    )
    prices = result.scalars().all()

    return EPEXSpotPriceListResponse(
        data=[EPEXSpotPriceResponse.model_validate(p) for p in prices],
        total=len(prices),
    )


@router.get("/prices/today", response_model=EPEXSpotPriceListResponse)
async def get_today_epex_prices(db: AsyncSession = Depends(get_db)):
    """Get EPEX spot prices for today."""
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    result = await db.execute(
        select(EPEXSpotPrice)
        .where(
            EPEXSpotPrice.date_hour >= start_of_day,
            EPEXSpotPrice.date_hour < end_of_day,
        )
        .order_by(EPEXSpotPrice.date_hour)
    )
    prices = result.scalars().all()

    return EPEXSpotPriceListResponse(
        data=[EPEXSpotPriceResponse.model_validate(p) for p in prices],
        total=len(prices),
    )
    


@router.get("/sunshine")
async def get_sunshine(db: AsyncSession = Depends(get_db)):
    """Get latest sunshine forecast."""
    from sqlalchemy import select
    from backend.models.system_settings import SystemSetting
    import json
    
    result = await db.execute(
        select(SystemSetting).where(SystemSetting.key == "sunshine_expectation")
    )
    setting = result.scalar_one_or_none()
    
    if not setting:
        return {"data": None, "message": "No sunshine data available"}
    
    return {"data": json.loads(setting.value)}


@router.post("/prices/fetch")
async def trigger_epex_fetch():
    from backend.services.epex_service import fetch_and_store_prices
    await fetch_and_store_prices()
    return {"message": "Fetch triggered"}

@router.post("/sunshine/fetch")
async def trigger_sunshine_fetch():
    from backend.services.sunshine_service import fetch_and_store_sunshine
    await fetch_and_store_sunshine()
    return {"message": "Sunshine fetch triggered"}