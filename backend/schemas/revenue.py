"""Revenue schemas."""
from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class RevenueBase(BaseModel):
    """Base revenue schema."""

    period_start: datetime
    period_end: datetime
    revenue_eur: float = Field(..., ge=0)


class SelfConsumptionRevenue(RevenueBase):
    """Schema for self-consumption savings."""

    energy_kwh: float = Field(..., ge=0)
    retail_price_eur_per_kwh: float = Field(..., gt=0)


class ExportRevenue(RevenueBase):
    """Schema for grid export revenue."""

    energy_kwh: float = Field(..., ge=0)
    epex_price_eur_per_kwh: float = Field(..., gt=0)


class ArbitrageRevenue(RevenueBase):
    """Schema for arbitrage profit."""

    charge_energy_kwh: float = Field(..., ge=0)
    discharge_energy_kwh: float = Field(..., ge=0)
    charge_cost_eur: float = Field(..., ge=0)
    discharge_revenue_eur: float = Field(..., ge=0)


class EVRevenue(RevenueBase):
    """Schema for EV charging revenue."""

    energy_kwh: float = Field(..., ge=0)
    tariff_eur_per_kwh: float = Field(..., gt=0)
    cost_eur_per_kwh: float = Field(..., gt=0)
    margin_eur_per_kwh: float = Field(..., gt=0)


class TotalRevenue(BaseModel):
    """Schema for total revenue."""

    period_start: datetime
    period_end: datetime
    self_consumption_eur: float = Field(default=0.0, ge=0)
    export_eur: float = Field(default=0.0, ge=0)
    arbitrage_eur: float = Field(default=0.0)
    ev_charging_eur: float = Field(default=0.0, ge=0)
    total_eur: float = Field(..., ge=0)
    cumulative_eur: float = Field(..., ge=0)
    payback_percentage: float = Field(..., ge=0, le=100)
    estimated_payback_date: datetime | None = None


class RevenueResponse(BaseModel):
    """Schema for revenue response."""

    installation_id: int
    period: str  # "day", "week", "month", "year"
    revenue: TotalRevenue
    breakdown: List[RevenueBase]

