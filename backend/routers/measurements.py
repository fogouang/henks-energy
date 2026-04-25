"""Measurement routes."""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.device_auth import get_edge_device_from_token
from backend.auth.middleware import get_current_user
from backend.auth.permissions import check_installation_access
from backend.config import settings
from backend.database import get_db
from backend.services.websocket_service import websocket_manager
from backend.models.edge_device import EdgeDevice
from backend.models.generator import Generator
from backend.models.inverter import Inverter
from backend.models.measurements import (
    BatteryMeasurement,
    EVChargerMeasurement,
    GeneratorMeasurement,
    InverterMeasurement,
    MeterMeasurement,
)
from backend.models.user import User
from backend.models.ev_charger import EVCharger
from backend.schemas.ev_charger import EVChargerInfo, EVChargerList
from backend.schemas.inverter import InverterInfo, InverterListForDevice
from backend.schemas.measurements import (
    BatteryMeasurementBatch,
    BatteryMeasurementCreate,
    BatteryMeasurementResponse,
    BulkMeasurementsRequest,
    BulkMeasurementsResponse,
    DeviceError,
    EVChargerMeasurementBatch,
    EVChargerMeasurementCreate,
    EVChargerMeasurementResponse,
    GeneratorMeasurementBatch,
    GeneratorMeasurementCreate,
    GeneratorMeasurementResponse,
    HistoricalDataResponse,
    InverterMeasurementBatch,
    InverterMeasurementCreate,
    InverterMeasurementResponse,
    LatestBatteryMeasurement,
    LatestEVChargerMeasurement,
    LatestGeneratorMeasurement,
    LatestInverterMeasurement,
    LatestMeasurementsResponse,
    LatestMeterMeasurement,
    MeasurementQueryParams,
    MeterMeasurementBatch,
    MeterMeasurementCreate,
    MeterMeasurementResponse,
)

router = APIRouter(prefix="/installations", tags=["measurements"])


# Edge device configuration endpoints (authenticated via device token)
@router.get("/{installation_id}/inverters", response_model=InverterListForDevice)
async def list_inverters_for_device(
    installation_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get list of inverters for edge device's installation."""
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Get inverters for installation
    result = await db.execute(
        select(Inverter).where(
            Inverter.installation_id == installation_id,
            Inverter.deleted_at.is_(None),
        ).order_by(Inverter.inverter_number)
    )
    inverters = result.scalars().all()
    
    return InverterListForDevice(
        inverters=[InverterInfo.model_validate(inv) for inv in inverters],
        total=len(inverters),
    )


@router.get("/{installation_id}/chargers", response_model=EVChargerList)
async def list_ev_chargers_for_device(
    installation_id: int,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get list of EV chargers for edge device's installation."""
    if not settings.ENABLE_EV_CHARGERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EV Chargers feature is not enabled",
        )
    
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Installation ID mismatch. Device belongs to installation {device.installation_id}, but requested installation {installation_id}",
        )
    
    # Get EV chargers for installation
    result = await db.execute(
        select(EVCharger).where(
            EVCharger.installation_id == installation_id,
            EVCharger.deleted_at.is_(None),
        ).order_by(EVCharger.charger_number)
    )
    chargers = result.scalars().all()
    
    return EVChargerList(
        chargers=[EVChargerInfo.model_validate(charger) for charger in chargers],
        total=len(chargers),
    )


@router.get("/{installation_id}/measurements/latest", response_model=LatestMeasurementsResponse)
async def get_latest_measurements(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """Get latest measurements for installation."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Get latest meter measurement
    meter_result = await db.execute(
        select(MeterMeasurement)
        .where(MeterMeasurement.installation_id == installation_id)
        .order_by(desc(MeterMeasurement.timestamp))
        .limit(1)
    )
    meter_measurement = meter_result.scalar_one_or_none()
    latest_meter = None
    if meter_measurement:
        latest_meter = LatestMeterMeasurement(
            timestamp=meter_measurement.timestamp,
            import_kw=meter_measurement.import_kw,
            export_kw=meter_measurement.export_kw,
            import_kwh=meter_measurement.import_kwh,
            export_kwh=meter_measurement.export_kwh,
            l1_a=meter_measurement.l1_a,
            l2_a=meter_measurement.l2_a,
            l3_a=meter_measurement.l3_a,
        )
    
    # Get latest battery measurement
    battery_result = await db.execute(
        select(BatteryMeasurement)
        .where(BatteryMeasurement.installation_id == installation_id)
        .order_by(desc(BatteryMeasurement.timestamp))
        .limit(1)
    )
    battery_measurement = battery_result.scalar_one_or_none()
    latest_battery = None
    if battery_measurement:
        # Get battery config from installation_configs
        from backend.models.config import InstallationConfig
        config_result = await db.execute(
            select(InstallationConfig).where(
                InstallationConfig.installation_id == installation_id,
                InstallationConfig.config_key.in_(["BATTERY_CAPACITY", "BATTERY_BUFFER"]),
            )
        )
        configs = {c.config_key: float(c.config_value) for c in config_result.scalars().all()}
        
        battery_capacity = configs.get("BATTERY_CAPACITY")
        battery_buffer = configs.get("BATTERY_BUFFER")
        
        available_capacity = battery_measurement.available_capacity
        available_percentage = None
        if available_capacity is not None and battery_capacity:
            available_percentage = (available_capacity / battery_capacity) * 100

        charging_status = None
        if battery_measurement.power_kw is not None:
            charging_status = "CHARGING" if battery_measurement.power_kw > 0 else "DISCHARGING"

        latest_battery = LatestBatteryMeasurement(
            timestamp=battery_measurement.timestamp,
            soc_percentage=battery_measurement.soc_percentage,
            power_kw=battery_measurement.power_kw,
            voltage=battery_measurement.voltage,
            temperature=battery_measurement.temperature,
            available_capacity=available_capacity,
            available_percentage=available_percentage,
            charging_status=charging_status,
            battery_capacity=battery_capacity,
            battery_buffer=battery_buffer,
        )
    
    # Get latest inverter measurements (one per inverter)
    inverter_result = await db.execute(
        select(InverterMeasurement)
        .where(InverterMeasurement.installation_id == installation_id)
        .order_by(desc(InverterMeasurement.timestamp))
    )
    inverter_measurements = inverter_result.scalars().all()
    latest_inverters = []
    seen_inverters = set()
    for inv_meas in inverter_measurements:
        if inv_meas.inverter_id not in seen_inverters:
            latest_inverters.append(
                LatestInverterMeasurement(
                    inverter_id=inv_meas.inverter_id,
                    timestamp=inv_meas.timestamp,
                    power_kw=inv_meas.power_kw,
                    energy_kwh_daily=inv_meas.energy_kwh_daily,
                    curtailment_percentage=inv_meas.curtailment_percentage,
                )
            )
            seen_inverters.add(inv_meas.inverter_id)
    
    # Get latest generator measurement
    latest_generator = None
    if settings.ENABLE_GENERATOR:
        generator_result = await db.execute(
            select(GeneratorMeasurement)
            .where(GeneratorMeasurement.installation_id == installation_id)
            .order_by(desc(GeneratorMeasurement.timestamp))
            .limit(1)
        )
        generator_measurement = generator_result.scalar_one_or_none()
        if generator_measurement:
            latest_generator = LatestGeneratorMeasurement(
                timestamp=generator_measurement.timestamp,
                status=generator_measurement.status,
                fuel_consumption_lph=generator_measurement.fuel_consumption_lph,
                charging_power_kw=generator_measurement.charging_power_kw,
            )
    
    # Get latest EV charger measurements (one per charger)
    latest_ev_chargers = []
    if settings.ENABLE_EV_CHARGERS:
        ev_charger_result = await db.execute(
            select(EVChargerMeasurement)
            .where(EVChargerMeasurement.installation_id == installation_id)
            .order_by(desc(EVChargerMeasurement.timestamp))
        )
        ev_charger_measurements = ev_charger_result.scalars().all()
        seen_chargers = set()
        for ev_meas in ev_charger_measurements:
            if ev_meas.charger_id not in seen_chargers:
                latest_ev_chargers.append(
                    LatestEVChargerMeasurement(
                        charger_id=ev_meas.charger_id,
                        timestamp=ev_meas.timestamp,
                        power_kw=ev_meas.power_kw,
                        energy_kwh=ev_meas.energy_kwh,
                        source=ev_meas.source,
                        revenue_eur=ev_meas.revenue_eur,
                    )
                )
                seen_chargers.add(ev_meas.charger_id)
    
    return LatestMeasurementsResponse(
        installation_id=installation_id,
        meter=latest_meter,
        battery=latest_battery,
        inverters=latest_inverters,
        generator=latest_generator,
        ev_chargers=latest_ev_chargers,
    )

@router.get("/{installation_id}/history", response_model=HistoricalDataResponse)
async def get_installation_history(
    installation_id: int,
    start: datetime = Query(...),
    end: datetime = Query(...),
    resolution: str = Query("1h", regex="^(5m|1h|1d)$"),
    components: list[str] = Query(default_factory=list),
    current_user: Annotated[User, Depends(get_current_user)] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
):
    """Get historical data for installation."""
    # Check access
    from backend.auth.permissions import check_installation_access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Simplified - would query actual measurements
    return HistoricalDataResponse(
        installation_id=installation_id,
        start=start,
        end=end,
        resolution=resolution,
        data=[],
    )


# Edge device measurement endpoints (authenticated via device token)
# Bulk endpoint must be registered first to ensure proper route matching
@router.post("/{installation_id}/measurements/bulk", status_code=status.HTTP_201_CREATED, response_model=BulkMeasurementsResponse)
async def create_bulk_measurements(
    installation_id: int,
    request: BulkMeasurementsRequest,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create measurements for all device types in a single request (bulk upload)."""
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    # Lists to collect all measurements for batch insert
    all_battery_measurements = []
    all_inverter_measurements = []
    all_meter_measurements = []
    all_generator_measurements = []
    all_ev_charger_measurements = []
    
    # Lists to store response data
    response_battery = []
    response_inverter = []
    response_meter = []
    response_generator = []
    response_ev_charger = []
    
    # List to collect errors for devices that fail validation
    device_errors = []
    
    # Variables to store device info for validation and broadcasting
    inverter = None
    charger = None
    
    # Validate and prepare battery measurements
    if request.battery:
        # Check for duplicate timestamps within the batch
        timestamps = [m.timestamp for m in request.battery]
        if len(timestamps) != len(set(timestamps)):
            duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate timestamps found in battery batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
            )
        
        # Create battery measurement objects
        all_battery_measurements = [
            BatteryMeasurement(
                timestamp=measurement.timestamp,
                installation_id=installation_id,
                soc_percentage=measurement.soc_percentage,
                power_kw=measurement.power_kw,
                voltage=measurement.voltage,
                temperature=measurement.temperature,
                available_capacity=measurement.available_capacity,
            )
            for measurement in request.battery
        ]
        response_battery = request.battery
    
    # Validate and prepare inverter measurements
    if request.inverter:
        if not request.inverter.measurements:
            device_errors.append(DeviceError(
                device_type="inverter",
                error="Inverter measurements array cannot be empty"
            ))
        else:
            inverter_id = request.inverter.inverter_id
            
            # Check for duplicate timestamps within the batch
            timestamps = [m.timestamp for m in request.inverter.measurements]
            if len(timestamps) != len(set(timestamps)):
                duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
                device_errors.append(DeviceError(
                    device_type="inverter",
                    error=f"Duplicate timestamps found in inverter batch: {list(set(duplicates))}. Each measurement must have a unique timestamp."
                ))
            else:
                # Verify inverter exists and belongs to installation
                result = await db.execute(
                    select(Inverter).where(
                        Inverter.id == inverter_id,
                        Inverter.installation_id == installation_id,
                        Inverter.deleted_at.is_(None),
                    )
                )
                inverter = result.scalar_one_or_none()
                if not inverter:
                    device_errors.append(DeviceError(
                        device_type="inverter",
                        error=f"Inverter with ID {inverter_id} not found for this installation"
                    ))
                else:
                    # Create inverter measurement objects
                    all_inverter_measurements = [
                        InverterMeasurement(
                            timestamp=measurement.timestamp,
                            installation_id=installation_id,
                            inverter_id=inverter_id,
                            power_kw=measurement.power_kw,
                            energy_kwh_daily=measurement.energy_kwh_daily,
                            curtailment_percentage=measurement.curtailment_percentage,
                        )
                        for measurement in request.inverter.measurements
                    ]
                    response_inverter = request.inverter.measurements
    
    # Validate and prepare meter measurements
    if request.meter:
        # Check for duplicate timestamps within the batch
        timestamps = [m.timestamp for m in request.meter]
        if len(timestamps) != len(set(timestamps)):
            duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate timestamps found in meter batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
            )
        
        # Create meter measurement objects
        all_meter_measurements = [
            MeterMeasurement(
                timestamp=measurement.timestamp,
                installation_id=installation_id,
                import_kw=measurement.import_kw,
                export_kw=measurement.export_kw,
                import_kwh=measurement.import_kwh,
                export_kwh=measurement.export_kwh,
                l1_a=measurement.l1_a,
                l2_a=measurement.l2_a,
                l3_a=measurement.l3_a,
            )
            for measurement in request.meter
        ]
        response_meter = request.meter
    
    # Validate and prepare generator measurements
    if request.generator:
        if not settings.ENABLE_GENERATOR:
            device_errors.append(DeviceError(
                device_type="generator",
                error="Generator feature is not enabled for this installation"
            ))
        else:
            # Check for duplicate timestamps within the batch
            timestamps = [m.timestamp for m in request.generator]
            if len(timestamps) != len(set(timestamps)):
                duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
                device_errors.append(DeviceError(
                    device_type="generator",
                    error=f"Duplicate timestamps found in generator batch: {list(set(duplicates))}. Each measurement must have a unique timestamp."
                ))
            else:
                # Verify generator exists and belongs to installation
                result = await db.execute(
                    select(Generator).where(
                        Generator.installation_id == installation_id,
                        Generator.deleted_at.is_(None),
                    )
                )
                generator = result.scalar_one_or_none()
                if not generator:
                    device_errors.append(DeviceError(
                        device_type="generator",
                        error="Generator not found for this installation"
                    ))
                else:
                    # Create generator measurement objects
                    all_generator_measurements = [
                        GeneratorMeasurement(
                            timestamp=measurement.timestamp,
                            installation_id=installation_id,
                            status=measurement.status,
                            fuel_consumption_lph=measurement.fuel_consumption_lph,
                            charging_power_kw=measurement.charging_power_kw,
                        )
                        for measurement in request.generator
                    ]
                    response_generator = request.generator
    
    # Validate and prepare EV charger measurements
    if request.ev_charger:
        if not settings.ENABLE_EV_CHARGERS:
            device_errors.append(DeviceError(
                device_type="ev_charger",
                error="EV Chargers feature is not enabled for this installation"
            ))
        elif not request.ev_charger.measurements:
            device_errors.append(DeviceError(
                device_type="ev_charger",
                error="EV charger measurements array cannot be empty"
            ))
        else:
            charger_id = request.ev_charger.charger_id
            
            # Check for duplicate timestamps within the batch
            timestamps = [m.timestamp for m in request.ev_charger.measurements]
            if len(timestamps) != len(set(timestamps)):
                duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
                device_errors.append(DeviceError(
                    device_type="ev_charger",
                    error=f"Duplicate timestamps found in EV charger batch: {list(set(duplicates))}. Each measurement must have a unique timestamp."
                ))
            else:
                # Verify charger exists and belongs to installation
                result = await db.execute(
                    select(EVCharger).where(
                        EVCharger.id == charger_id,
                        EVCharger.installation_id == installation_id,
                        EVCharger.deleted_at.is_(None),
                    )
                )
                charger = result.scalar_one_or_none()
                if not charger:
                    device_errors.append(DeviceError(
                        device_type="ev_charger",
                        error=f"EV Charger with ID {charger_id} not found for this installation"
                    ))
                else:
                    # Create EV charger measurement objects
                    all_ev_charger_measurements = [
                        EVChargerMeasurement(
                            timestamp=measurement.timestamp,
                            installation_id=installation_id,
                            charger_id=charger_id,
                            power_kw=measurement.power_kw,
                            energy_kwh=measurement.energy_kwh,
                            source=measurement.source,
                            revenue_eur=measurement.revenue_eur,
                        )
                        for measurement in request.ev_charger.measurements
                    ]
                    response_ev_charger = request.ev_charger.measurements
    
    # Create all measurements in a single transaction (only if we have valid measurements)
    if (all_battery_measurements or all_inverter_measurements or all_meter_measurements or 
        all_generator_measurements or all_ev_charger_measurements):
        try:
            if all_battery_measurements:
                db.add_all(all_battery_measurements)
            if all_inverter_measurements:
                db.add_all(all_inverter_measurements)
            if all_meter_measurements:
                db.add_all(all_meter_measurements)
            if all_generator_measurements:
                db.add_all(all_generator_measurements)
            if all_ev_charger_measurements:
                db.add_all(all_ev_charger_measurements)
            
            await db.commit()
        except IntegrityError as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists. Original error: {str(e)}",
            )
    
    # Refresh all measurements
    for battery_measurement in all_battery_measurements:
        await db.refresh(battery_measurement)
    for inverter_measurement in all_inverter_measurements:
        await db.refresh(inverter_measurement)
    for meter_measurement in all_meter_measurements:
        await db.refresh(meter_measurement)
    for generator_measurement in all_generator_measurements:
        await db.refresh(generator_measurement)
    for ev_charger_measurement in all_ev_charger_measurements:
        await db.refresh(ev_charger_measurement)
    
    # Broadcast updates for each measurement type
    for battery_measurement in all_battery_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "battery_update",
            {
                "soc_percentage": battery_measurement.soc_percentage,
                "power_kw": battery_measurement.power_kw,
                "voltage": battery_measurement.voltage,
                "temperature": battery_measurement.temperature,
                "timestamp": battery_measurement.timestamp.isoformat(),
            },
        )
    
    for inverter_measurement in all_inverter_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "inverter_update",
            {
                "inverter_id": inverter_measurement.inverter_id,
                "power_kw": inverter_measurement.power_kw,
                "energy_kwh_daily": inverter_measurement.energy_kwh_daily,
                "curtailment_percentage": inverter_measurement.curtailment_percentage,
                "timestamp": inverter_measurement.timestamp.isoformat(),
            },
        )
    
    for meter_measurement in all_meter_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "meter_update",
            {
                "import_kw": meter_measurement.import_kw,
                "export_kw": meter_measurement.export_kw,
                "import_kwh": meter_measurement.import_kwh,
                "export_kwh": meter_measurement.export_kwh,
                "l1_a": meter_measurement.l1_a,
                "l2_a": meter_measurement.l2_a,
                "l3_a": meter_measurement.l3_a,
                "timestamp": meter_measurement.timestamp.isoformat(),
            },
        )
    
    for generator_measurement in all_generator_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "generator_update",
            {
                "status": generator_measurement.status,
                "fuel_consumption_lph": generator_measurement.fuel_consumption_lph,
                "charging_power_kw": generator_measurement.charging_power_kw,
                "timestamp": generator_measurement.timestamp.isoformat(),
            },
        )
    
    for ev_charger_measurement in all_ev_charger_measurements:
        # charger should be set if we have ev_charger_measurements
        charger_number = charger.charger_number if charger else None
        await websocket_manager.broadcast(
            installation_id,
            "ev_charger_update",
            {
                "charger_id": ev_charger_measurement.charger_id,
                "charger_number": charger_number,
                "power_kw": ev_charger_measurement.power_kw,
                "energy_kwh": ev_charger_measurement.energy_kwh,
                "source": ev_charger_measurement.source,
                "revenue_eur": ev_charger_measurement.revenue_eur,
                "timestamp": ev_charger_measurement.timestamp.isoformat(),
            },
        )
    
    # Calculate totals for bulk response
    inverter_count = 0
    if request.inverter is not None and request.inverter.measurements:
        inverter_count = len(request.inverter.measurements)
    
    ev_charger_count = 0
    if request.ev_charger is not None and request.ev_charger.measurements:
        ev_charger_count = len(request.ev_charger.measurements)
    
    total_accepted = (
        (len(request.battery) if request.battery else 0) +
        inverter_count +
        (len(request.meter) if request.meter else 0) +
        (len(request.generator) if request.generator else 0) +
        ev_charger_count
    )
    
    total_rows_added = (
        len(all_battery_measurements) +
        len(all_inverter_measurements) +
        len(all_meter_measurements) +
        len(all_generator_measurements) +
        len(all_ev_charger_measurements)
    )
    
    return BulkMeasurementsResponse(
        accepted=total_accepted,
        total_rows_added=total_rows_added,
        version="2.0.0",
        battery=response_battery,
        inverter=response_inverter,
        meter=response_meter,
        generator=response_generator,
        ev_charger=response_ev_charger,
        errors=device_errors,
    )


@router.post("/{installation_id}/measurements/battery", status_code=status.HTTP_201_CREATED, response_model=BatteryMeasurementResponse)
async def create_battery_measurement(
    installation_id: int,
    measurements: BatteryMeasurementBatch,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create battery measurements from edge device (batch support)."""
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    if not measurements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement is required",
        )
    
    accepted_count = len(measurements)
    
    # Check for duplicate timestamps within the batch
    timestamps = [m.timestamp for m in measurements]
    if len(timestamps) != len(set(timestamps)):
        duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate timestamps found in batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
        )
    
    # Create measurements
    battery_measurements = [
        BatteryMeasurement(
            timestamp=measurement.timestamp,
            installation_id=installation_id,
            soc_percentage=measurement.soc_percentage,
            power_kw=measurement.power_kw,
            voltage=measurement.voltage,
            temperature=measurement.temperature,
            available_capacity=measurement.available_capacity,
        )
        for measurement in measurements
    ]
    
    try:
        db.add_all(battery_measurements)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists for this installation. Original error: {str(e)}",
        )
    
    total_rows_added = len(battery_measurements)
    
    # Refresh all measurements
    for battery_measurement in battery_measurements:
        await db.refresh(battery_measurement)
    
    # Broadcast updates for each measurement
    for battery_measurement in battery_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "battery_update",
            {
                "soc_percentage": battery_measurement.soc_percentage,
                "power_kw": battery_measurement.power_kw,
                "voltage": battery_measurement.voltage,
                "temperature": battery_measurement.temperature,
                "timestamp": battery_measurement.timestamp.isoformat(),
            },
        )
    
    return BatteryMeasurementResponse(
        accepted=accepted_count,
        total_rows_added=total_rows_added,
        version="2.0.0",
        data=measurements,
    )


@router.post("/{installation_id}/measurements/inverter/{inverter_id}", status_code=status.HTTP_201_CREATED, response_model=InverterMeasurementResponse)
async def create_inverter_measurement(
    installation_id: int,
    inverter_id: int,
    measurements: InverterMeasurementBatch,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create inverter measurements from edge device (batch support)."""
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    if not measurements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement is required",
        )
    
    accepted_count = len(measurements)
    
    # Check for duplicate timestamps within the batch
    timestamps = [m.timestamp for m in measurements]
    if len(timestamps) != len(set(timestamps)):
        duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate timestamps found in batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
        )
    
    # Verify inverter exists and belongs to installation
    result = await db.execute(
        select(Inverter).where(
            Inverter.id == inverter_id,
            Inverter.installation_id == installation_id,
            Inverter.deleted_at.is_(None),
        )
    )
    inverter = result.scalar_one_or_none()
    if not inverter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inverter not found",
        )
    
    # Create measurements
    inverter_measurements = [
        InverterMeasurement(
            timestamp=measurement.timestamp,
            installation_id=installation_id,
            inverter_id=inverter_id,
            power_kw=measurement.power_kw,
            energy_kwh_daily=measurement.energy_kwh_daily,
            curtailment_percentage=measurement.curtailment_percentage,
        )
        for measurement in measurements
    ]
    
    try:
        db.add_all(inverter_measurements)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists for this inverter. Original error: {str(e)}",
        )
    
    total_rows_added = len(inverter_measurements)
    
    # Refresh all measurements
    for inverter_measurement in inverter_measurements:
        await db.refresh(inverter_measurement)
    
    # Broadcast updates for each measurement
    for inverter_measurement in inverter_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "inverter_update",
            {
                "inverter_id": inverter_id,
                "power_kw": inverter_measurement.power_kw,
                "energy_kwh_daily": inverter_measurement.energy_kwh_daily,
                "curtailment_percentage": inverter_measurement.curtailment_percentage,
                "timestamp": inverter_measurement.timestamp.isoformat(),
            },
        )
    
    return InverterMeasurementResponse(
        accepted=accepted_count,
        total_rows_added=total_rows_added,
        version="2.0.0",
        data=measurements,
    )


@router.post("/{installation_id}/measurements/meter", status_code=status.HTTP_201_CREATED, response_model=MeterMeasurementResponse)
async def create_meter_measurement(
    installation_id: int,
    measurements: MeterMeasurementBatch,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create meter measurements from edge device (batch support)."""
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    if not measurements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement is required",
        )
    
    accepted_count = len(measurements)
    
    # Check for duplicate timestamps within the batch
    timestamps = [m.timestamp for m in measurements]
    if len(timestamps) != len(set(timestamps)):
        duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate timestamps found in batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
        )
    
    # Create measurements
    meter_measurements = [
        MeterMeasurement(
            timestamp=measurement.timestamp,
            installation_id=installation_id,
            import_kw=measurement.import_kw,
            export_kw=measurement.export_kw,
            import_kwh=measurement.import_kwh,
            export_kwh=measurement.export_kwh,
            l1_a=measurement.l1_a,
            l2_a=measurement.l2_a,
            l3_a=measurement.l3_a,
        )
        for measurement in measurements
    ]
    
    try:
        db.add_all(meter_measurements)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists for this installation. Original error: {str(e)}",
        )
    
    total_rows_added = len(meter_measurements)
    
    # Refresh all measurements
    for meter_measurement in meter_measurements:
        await db.refresh(meter_measurement)
    
    # Log before broadcasting
    import logging
    logger = logging.getLogger(__name__)
    
    # Broadcast updates for each measurement
    for meter_measurement in meter_measurements:
        # Prepare broadcast data
        broadcast_data = {
            "import_kw": meter_measurement.import_kw,
            "export_kw": meter_measurement.export_kw,
            "import_kwh": meter_measurement.import_kwh,
            "export_kwh": meter_measurement.export_kwh,
            "l1_a": meter_measurement.l1_a,
            "l2_a": meter_measurement.l2_a,
            "l3_a": meter_measurement.l3_a,
            "timestamp": meter_measurement.timestamp.isoformat(),
        }
        
        print(f"[MEASUREMENTS] 📡 Broadcasting meter_update for installation {installation_id}: {broadcast_data}")
        logger.info(f"📡 Broadcasting meter_update for installation {installation_id}: {broadcast_data}")
        
        # Broadcast update via Pusher
        try:
            print(f"[MEASUREMENTS] Calling websocket_manager.broadcast for installation {installation_id}")
            await websocket_manager.broadcast(
                installation_id,
                "meter_update",
                broadcast_data,
            )
            print(f"[MEASUREMENTS] ✅ Successfully broadcasted meter_update for installation {installation_id}")
            logger.info(f"✅ Successfully broadcasted meter_update for installation {installation_id}")
        except Exception as e:
            print(f"[MEASUREMENTS] ❌ Failed to broadcast meter_update for installation {installation_id}: {e}")
            import traceback
            traceback.print_exc()
            logger.error(f"❌ Failed to broadcast meter_update for installation {installation_id}: {e}", exc_info=True)
    
    return MeterMeasurementResponse(
        accepted=accepted_count,
        total_rows_added=total_rows_added,
        version="2.0.0",
        data=measurements,
    )


@router.post("/{installation_id}/measurements/generator", status_code=status.HTTP_201_CREATED, response_model=GeneratorMeasurementResponse)
async def create_generator_measurement(
    installation_id: int,
    measurements: GeneratorMeasurementBatch,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create generator measurements from edge device (batch support)."""
    if not settings.ENABLE_GENERATOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Generator feature is not enabled",
        )
    
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    if not measurements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement is required",
        )
    
    accepted_count = len(measurements)
    
    # Check for duplicate timestamps within the batch
    timestamps = [m.timestamp for m in measurements]
    if len(timestamps) != len(set(timestamps)):
        duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate timestamps found in batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
        )
    
    # Verify generator exists and belongs to installation
    result = await db.execute(
        select(Generator).where(
            Generator.installation_id == installation_id,
            Generator.deleted_at.is_(None),
        )
    )
    generator = result.scalar_one_or_none()
    if not generator:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generator not found for this installation",
        )
    
    # Create measurements
    generator_measurements = [
        GeneratorMeasurement(
            timestamp=measurement.timestamp,
            installation_id=installation_id,
            status=measurement.status,
            fuel_consumption_lph=measurement.fuel_consumption_lph,
            charging_power_kw=measurement.charging_power_kw,
        )
        for measurement in measurements
    ]
    
    try:
        db.add_all(generator_measurements)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists for this installation. Original error: {str(e)}",
        )
    
    total_rows_added = len(generator_measurements)
    
    # Refresh all measurements
    for generator_measurement in generator_measurements:
        await db.refresh(generator_measurement)
    
    # Broadcast updates for each measurement
    for generator_measurement in generator_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "generator_update",
            {
                "status": generator_measurement.status,
                "fuel_consumption_lph": generator_measurement.fuel_consumption_lph,
                "charging_power_kw": generator_measurement.charging_power_kw,
                "timestamp": generator_measurement.timestamp.isoformat(),
            },
        )
    
    return GeneratorMeasurementResponse(
        accepted=accepted_count,
        total_rows_added=total_rows_added,
        version="2.0.0",
        data=measurements,
    )


@router.post("/{installation_id}/measurements/charger/{charger_id}", status_code=status.HTTP_201_CREATED, response_model=EVChargerMeasurementResponse)
async def create_ev_charger_measurement(
    installation_id: int,
    charger_id: int,
    measurements: EVChargerMeasurementBatch,
    device: Annotated[EdgeDevice, Depends(get_edge_device_from_token)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create EV charger measurements from edge device (batch support)."""
    if not settings.ENABLE_EV_CHARGERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="EV Chargers feature is not enabled",
        )
    
    # Validate installation_id matches device's installation
    if device.installation_id != installation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Installation ID mismatch",
        )
    
    if not measurements:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one measurement is required",
        )
    
    accepted_count = len(measurements)
    
    # Check for duplicate timestamps within the batch
    timestamps = [m.timestamp for m in measurements]
    if len(timestamps) != len(set(timestamps)):
        duplicates = [ts for ts in timestamps if timestamps.count(ts) > 1]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Duplicate timestamps found in batch: {list(set(duplicates))}. Each measurement must have a unique timestamp.",
        )
    
    # Verify charger exists and belongs to installation
    result = await db.execute(
        select(EVCharger).where(
            EVCharger.id == charger_id,
            EVCharger.installation_id == installation_id,
            EVCharger.deleted_at.is_(None),
        )
    )
    charger = result.scalar_one_or_none()
    if not charger:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="EV Charger not found",
        )
    
    # Create measurements
    ev_charger_measurements = [
        EVChargerMeasurement(
            timestamp=measurement.timestamp,
            installation_id=installation_id,
            charger_id=charger_id,
            power_kw=measurement.power_kw,
            energy_kwh=measurement.energy_kwh,
            source=measurement.source,
            revenue_eur=measurement.revenue_eur,
        )
        for measurement in measurements
    ]
    
    try:
        db.add_all(ev_charger_measurements)
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Duplicate measurement detected. A measurement with the same timestamp already exists for this charger. Original error: {str(e)}",
        )
    
    total_rows_added = len(ev_charger_measurements)
    
    # Refresh all measurements
    for ev_charger_measurement in ev_charger_measurements:
        await db.refresh(ev_charger_measurement)
    
    # Broadcast updates for each measurement
    for ev_charger_measurement in ev_charger_measurements:
        await websocket_manager.broadcast(
            installation_id,
            "ev_charger_update",
            {
                "charger_id": charger_id,
                "charger_number": charger.charger_number,
                "power_kw": ev_charger_measurement.power_kw,
                "energy_kwh": ev_charger_measurement.energy_kwh,
                "source": ev_charger_measurement.source,
                "revenue_eur": ev_charger_measurement.revenue_eur,
                "timestamp": ev_charger_measurement.timestamp.isoformat(),
            },
        )
    
    return EVChargerMeasurementResponse(
        accepted=accepted_count,
        total_rows_added=total_rows_added,
        version="2.0.0",
        data=measurements,
    )

