"""Measurement schemas."""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, model_validator


class MeasurementQueryParams(BaseModel):
    """Schema for measurement query parameters."""

    start: datetime
    end: datetime
    resolution: Literal["5m", "1h", "1d"] = Field(default="1h")
    components: List[str] = Field(default_factory=list)  # ["battery", "inverter", "meter", etc.]


class TimeSeriesDataPoint(BaseModel):
    """Schema for a single time-series data point."""

    timestamp: datetime
    value: float


class TimeSeriesData(BaseModel):
    """Schema for time-series data."""

    component: str
    metric: str
    unit: str
    data: List[TimeSeriesDataPoint]


class HistoricalDataResponse(BaseModel):
    """Schema for historical data response."""

    installation_id: int
    start: datetime
    end: datetime
    resolution: str
    data: List[TimeSeriesData]


# Request schemas for edge device measurements
class BatteryMeasurementCreate(BaseModel):
    """Schema for creating battery measurement."""

    soc_percentage: float = Field(..., ge=0, le=100)
    power_kw: float
    voltage: float | None = None
    temperature: float | None = None
    available_capacity: float | None = None
    timestamp: datetime


class InverterMeasurementCreate(BaseModel):
    """Schema for creating inverter measurement."""

    power_kw: float
    energy_kwh_daily: float = Field(default=0.0, ge=0)
    curtailment_percentage: float = Field(default=0.0, ge=0, le=100)
    timestamp: datetime


class MeterMeasurementCreate(BaseModel):
    """Schema for creating meter measurement."""

    import_kw: float
    export_kw: float
    import_kwh: float = Field(default=0.0, ge=0)
    export_kwh: float = Field(default=0.0, ge=0)
    l1_a: float = Field(default=0.0)
    l2_a: float = Field(default=0.0)
    l3_a: float = Field(default=0.0)
    timestamp: datetime


class GeneratorMeasurementCreate(BaseModel):
    """Schema for creating generator measurement."""

    status: str = Field(..., max_length=20)
    fuel_consumption_lph: float = Field(default=0.0, ge=0)
    charging_power_kw: float = Field(default=0.0)
    timestamp: datetime


class EVChargerMeasurementCreate(BaseModel):
    """Schema for creating EV charger measurement."""

    power_kw: float
    energy_kwh: float = Field(default=0.0, ge=0)
    source: str = Field(..., max_length=20)
    revenue_eur: float = Field(default=0.0, ge=0)
    timestamp: datetime


# Batch request schemas (arrays of measurements)
BatteryMeasurementBatch = List[BatteryMeasurementCreate]
InverterMeasurementBatch = List[InverterMeasurementCreate]
MeterMeasurementBatch = List[MeterMeasurementCreate]
GeneratorMeasurementBatch = List[GeneratorMeasurementCreate]
EVChargerMeasurementBatch = List[EVChargerMeasurementCreate]


# Response schemas for measurement endpoints
class MeasurementResponse(BaseModel):
    """Base schema for measurement endpoint responses."""

    accepted: int = Field(..., description="Number of measurements accepted in the request")
    total_rows_added: int = Field(..., description="Total number of rows added to the database")
    version: str = Field(default="2.0.0", description="API version")


class BatteryMeasurementResponse(MeasurementResponse):
    """Schema for battery measurement endpoint response."""

    data: List[BatteryMeasurementCreate] = Field(..., description="Created battery measurements")


class InverterMeasurementResponse(MeasurementResponse):
    """Schema for inverter measurement endpoint response."""

    data: List[InverterMeasurementCreate] = Field(..., description="Created inverter measurements")


class MeterMeasurementResponse(MeasurementResponse):
    """Schema for meter measurement endpoint response."""

    data: List[MeterMeasurementCreate] = Field(..., description="Created meter measurements")


class GeneratorMeasurementResponse(MeasurementResponse):
    """Schema for generator measurement endpoint response."""

    data: List[GeneratorMeasurementCreate] = Field(..., description="Created generator measurements")


class EVChargerMeasurementResponse(MeasurementResponse):
    """Schema for EV charger measurement endpoint response."""

    data: List[EVChargerMeasurementCreate] = Field(..., description="Created EV charger measurements")


# Response schemas for latest measurements
class LatestMeterMeasurement(BaseModel):
    """Schema for latest meter measurement."""

    timestamp: datetime
    import_kw: float
    export_kw: float
    import_kwh: float
    export_kwh: float
    l1_a: float
    l2_a: float
    l3_a: float


class LatestBatteryMeasurement(BaseModel):
    """Schema for latest battery measurement."""
    timestamp: datetime
    soc_percentage: float
    power_kw: float
    voltage: float | None
    temperature: float | None
    available_capacity: float | None = None  
    available_percentage: float | None = None 
    charging_status: str | None = None  
    battery_capacity: float | None = None 
    battery_buffer: float | None = None  


class LatestInverterMeasurement(BaseModel):
    """Schema for latest inverter measurement."""

    inverter_id: int
    timestamp: datetime
    power_kw: float
    energy_kwh_daily: float
    curtailment_percentage: float


class LatestGeneratorMeasurement(BaseModel):
    """Schema for latest generator measurement."""

    timestamp: datetime
    status: str
    fuel_consumption_lph: float
    charging_power_kw: float


class LatestEVChargerMeasurement(BaseModel):
    """Schema for latest EV charger measurement."""

    charger_id: int
    timestamp: datetime
    power_kw: float
    energy_kwh: float
    source: str
    revenue_eur: float


class LatestMeasurementsResponse(BaseModel):
    """Schema for latest measurements response."""

    installation_id: int
    meter: LatestMeterMeasurement | None = None
    battery: LatestBatteryMeasurement | None = None
    inverters: List[LatestInverterMeasurement] = Field(default_factory=list)
    generator: LatestGeneratorMeasurement | None = None
    ev_chargers: List[LatestEVChargerMeasurement] = Field(default_factory=list)


# Bulk upload schemas
class InverterMeasurementsGroup(BaseModel):
    """Schema for inverter measurements with device ID."""

    inverter_id: int
    measurements: List[InverterMeasurementCreate]


class EVChargerMeasurementsGroup(BaseModel):
    """Schema for EV charger measurements with device ID."""

    charger_id: int
    measurements: List[EVChargerMeasurementCreate]


class BulkMeasurementsRequest(BaseModel):
    """Schema for bulk measurements upload request."""

    battery: Optional[List[BatteryMeasurementCreate]] = None
    inverter: Optional[InverterMeasurementsGroup] = None
    meter: Optional[List[MeterMeasurementCreate]] = None
    generator: Optional[List[GeneratorMeasurementCreate]] = None
    ev_charger: Optional[EVChargerMeasurementsGroup] = None

    @model_validator(mode="after")
    def validate_at_least_one_device(self):
        """Validate that at least one device type is provided."""
        has_battery = self.battery is not None and len(self.battery) > 0
        has_inverter = self.inverter is not None and len(self.inverter.measurements) > 0
        has_meter = self.meter is not None and len(self.meter) > 0
        has_generator = self.generator is not None and len(self.generator) > 0
        has_ev_charger = self.ev_charger is not None and len(self.ev_charger.measurements) > 0

        if not (has_battery or has_inverter or has_meter or has_generator or has_ev_charger):
            raise ValueError("At least one device type with measurements must be provided")
        return self


class DeviceError(BaseModel):
    """Schema for device-specific error in bulk response."""

    device_type: str = Field(..., description="Device type that had an error (e.g., 'inverter', 'generator', 'ev_charger')")
    error: str = Field(..., description="Error message describing what went wrong")


class BulkMeasurementsResponse(MeasurementResponse):
    """Schema for bulk measurements upload response."""

    battery: List[BatteryMeasurementCreate] = Field(default_factory=list, description="Created battery measurements")
    inverter: List[InverterMeasurementCreate] = Field(default_factory=list, description="Created inverter measurements")
    meter: List[MeterMeasurementCreate] = Field(default_factory=list, description="Created meter measurements")
    generator: List[GeneratorMeasurementCreate] = Field(default_factory=list, description="Created generator measurements")
    ev_charger: List[EVChargerMeasurementCreate] = Field(default_factory=list, description="Created EV charger measurements")
    errors: List[DeviceError] = Field(default_factory=list, description="Errors for device types that failed validation or were not found")

