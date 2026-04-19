"""Meter schemas."""
from datetime import datetime

from pydantic import BaseModel, Field


class MeterBase(BaseModel):
    """Base meter schema."""

    import_kw: float = Field(default=0.0)
    export_kw: float = Field(default=0.0)
    import_kwh_total: float = Field(default=0.0, ge=0)
    export_kwh_total: float = Field(default=0.0, ge=0)
    l1_current_a: float = Field(default=0.0, ge=0)
    l2_current_a: float = Field(default=0.0, ge=0)
    l3_current_a: float = Field(default=0.0, ge=0)


class MeterUpdate(BaseModel):
    """Schema for updating meter."""

    import_kw: float | None = None
    export_kw: float | None = None
    import_kwh_total: float | None = Field(None, ge=0)
    export_kwh_total: float | None = Field(None, ge=0)
    l1_current_a: float | None = Field(None, ge=0)
    l2_current_a: float | None = Field(None, ge=0)
    l3_current_a: float | None = Field(None, ge=0)


class MeterResponse(MeterBase):
    """Schema for meter response."""

    id: int
    installation_id: int
    last_measurement_at: datetime | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MeterMeasurementResponse(BaseModel):
    """Schema for meter measurement response."""

    timestamp: datetime
    installation_id: int
    import_kw: float
    export_kw: float
    import_kwh: float
    export_kwh: float
    l1_a: float
    l2_a: float
    l3_a: float

    class Config:
        from_attributes = True


class MeterPhaseData(BaseModel):
    """Schema for meter phase data."""

    l1_a: float
    l2_a: float
    l3_a: float
    total_current_a: float

