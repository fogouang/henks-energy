"""Schemas for EPEX spot price data."""
from datetime import datetime
from pydantic import BaseModel


class EPEXSpotPriceBase(BaseModel):
    date_hour: datetime
    price: float


class EPEXSpotPriceCreate(EPEXSpotPriceBase):
    pass


class EPEXSpotPriceResponse(EPEXSpotPriceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EPEXSpotPriceListResponse(BaseModel):
    data: list[EPEXSpotPriceResponse]
    total: int