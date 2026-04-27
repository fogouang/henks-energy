"""Installation routes."""
import logging
from datetime import datetime, timedelta
from typing import Annotated

import httpx
import pytz
from backend.models.system_settings import SystemSetting
import pycountry
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.auth.middleware import get_current_admin_user, get_current_user
from backend.auth.permissions import check_installation_access, get_user_installations
from backend.config import settings
from backend.database import get_db
from backend.models.battery import Battery
from backend.models.ev_charger import EVCharger
from backend.models.generator import Generator, GeneratorStatus
from backend.models.installation import Installation
from backend.models.inverter import Inverter
from backend.models.meter import MainMeter
from backend.models.user import AccessLevel, User, UserInstallation, UserRole
from backend.schemas.installation import (
    InstallationComponentData,
    InstallationCreate,
    InstallationList,
    InstallationResponse,
    InstallationUpdate,
    InverterComponentItem,
    ChargerComponentItem,
)
from backend.schemas.location import City, CityList, Country, CountryList, State, StateList
from backend.schemas.weather import WeatherData, WeatherResponse
from backend.services.weather_cache import weather_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/installations", tags=["installations"])

@router.get("/reverse-ssh-host")
async def get_reverse_ssh_host(db: Annotated[AsyncSession, Depends(get_db)]):
    result = await db.execute(
        select(SystemSetting)
        .where(SystemSetting.key == "REVERSE_SSH_HOST")
        .limit(1)
    )
    config = result.scalar_one_or_none()
    config_value = config.value if config else ''
    return {"host": config_value}
    
@router.get("", response_model=InstallationList)
async def list_installations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """List all installations accessible to user."""
    from backend.models.user import UserRole
    
    installations = await get_user_installations(db, current_user)
    
    # For admin users, include owner information
    if current_user.role == UserRole.ADMIN:
        from sqlalchemy import select
        installation_responses = []
        for installation in installations:
            # Get the owner (first user with ADMIN access level, non-deleted)
            result = await db.execute(
                select(UserInstallation)
                .where(
                    UserInstallation.installation_id == installation.id,
                    UserInstallation.access_level == AccessLevel.ADMIN,
                    UserInstallation.deleted_at.is_(None),
                )
                .order_by(UserInstallation.granted_at.asc())
                .limit(1)
            )
            owner_access = result.scalar_one_or_none()
            owner_email = None
            if owner_access:
                user_result = await db.execute(
                    select(User).where(
                        User.id == owner_access.user_id,
                        User.deleted_at.is_(None),
                    )
                )
                owner = user_result.scalar_one_or_none()
                if owner:
                    owner_email = owner.email
            
            # Create response with owner_email
            installation_response = InstallationResponse.model_validate(installation)
            installation_response.owner_email = owner_email
            installation_responses.append(installation_response)
        
        return InstallationList(installations=installation_responses, total=len(installation_responses))
    
    # For regular users, return installations without owner_email
    installation_responses = [
        InstallationResponse.model_validate(installation)
        for installation in installations
    ]
    
    return InstallationList(installations=installation_responses, total=len(installation_responses))


@router.get("/{installation_id}", response_model=InstallationResponse)
async def get_installation(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get installation by ID."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    return installation


@router.get("/{installation_id}/component-data", response_model=InstallationComponentData)
async def get_installation_component_data(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get inverters and chargers with has_measurements for edit UI (data-loss warning)."""
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )

    from backend.models.measurements import EVChargerMeasurement, InverterMeasurement

    # Inverters with has_measurements
    inv_result = await db.execute(
        select(Inverter)
        .where(
            Inverter.installation_id == installation_id,
            Inverter.deleted_at.is_(None),
        )
        .order_by(Inverter.inverter_number)
    )
    inverters = inv_result.scalars().all()
    inv_ids_with_data = set()
    if inverters:
        im_result = await db.execute(
            select(InverterMeasurement.inverter_id)
            .where(InverterMeasurement.installation_id == installation_id)
            .distinct()
        )
        inv_ids_with_data = {row[0] for row in im_result.all()}
    inverter_items = [
        InverterComponentItem(
            inverter_number=inv.inverter_number,
            has_measurements=inv.id in inv_ids_with_data,
        )
        for inv in inverters
    ]

    # Chargers with has_measurements (only if feature enabled)
    charger_items = []
    if settings.ENABLE_EV_CHARGERS:
        ch_result = await db.execute(
            select(EVCharger)
            .where(
                EVCharger.installation_id == installation_id,
                EVCharger.deleted_at.is_(None),
            )
            .order_by(EVCharger.charger_number)
        )
        chargers = ch_result.scalars().all()
        charger_ids_with_data = set()
        if chargers:
            cm_result = await db.execute(
                select(EVChargerMeasurement.charger_id)
                .where(EVChargerMeasurement.installation_id == installation_id)
                .distinct()
            )
            charger_ids_with_data = {row[0] for row in cm_result.all()}
        charger_items = [
            ChargerComponentItem(
                charger_number=ch.charger_number,
                has_measurements=ch.id in charger_ids_with_data,
            )
            for ch in chargers
        ]

    return InstallationComponentData(inverters=inverter_items, chargers=charger_items)


@router.get("/{installation_id}/live")
async def get_installation_live(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get live snapshot of installation (all components with latest measurements)."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    result = await db.execute(
        select(Installation)
        .where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
        .options(
            selectinload(Installation.battery),
            selectinload(Installation.inverters),
            selectinload(Installation.main_meter),
            selectinload(Installation.generator),
            selectinload(Installation.ev_chargers),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Import measurement models and schemas
    from backend.models.measurements import (
        BatteryMeasurement,
        EVChargerMeasurement,
        GeneratorMeasurement,
        InverterMeasurement,
        MeterMeasurement,
    )
    from backend.schemas.measurements import (
        LatestBatteryMeasurement,
        LatestEVChargerMeasurement,
        LatestGeneratorMeasurement,
        LatestInverterMeasurement,
        LatestMeterMeasurement,
    )
    from sqlalchemy import desc
    
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
    
    # Return live data with configuration and latest measurements
    return {
        "installation": installation,
        "battery": installation.battery,
        "inverters": installation.inverters,
        "meter": installation.main_meter,
        "generator": installation.generator if settings.ENABLE_GENERATOR else None,
        "ev_chargers": installation.ev_chargers if settings.ENABLE_EV_CHARGERS else [],
        "latest_measurements": {
            "meter": latest_meter,
            "battery": latest_battery,
            "inverters": latest_inverters,
            "generator": latest_generator,
            "ev_chargers": latest_ev_chargers,
        },
    }


@router.post("", response_model=InstallationResponse, status_code=status.HTTP_201_CREATED)
async def create_installation(
    installation_data: InstallationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Create a new installation."""
    from backend.models.user import UserRole

    # Verify user_id exists and is valid (admin can create for any user, regular users can only create for themselves)
    target_user_id = installation_data.user_id
    if current_user.role != UserRole.ADMIN and target_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create installations for yourself",
        )
    
    # Verify target user exists and is active
    user_result = await db.execute(select(User).where(User.id == target_user_id, User.deleted_at.is_(None)))
    target_user = user_result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    if not target_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create installation for inactive user",
        )
    
    # Create installation
    installation = Installation(
        name=installation_data.name,
        country=installation_data.country,
        state=installation_data.state,
        city=installation_data.city,
        timezone=installation_data.timezone,
        has_pv=installation_data.has_pv,
        has_battery=installation_data.has_battery,
        has_generator=installation_data.has_generator,
        has_ev_chargers=installation_data.has_ev_chargers,
        inverter_count=installation_data.inverter_count,
        charger_count=installation_data.charger_count,
    )
    
    db.add(installation)
    await db.flush()  # Get installation.id
    
    # Assign user with ADMIN access level
    user_installation = UserInstallation(
        user_id=target_user_id,
        installation_id=installation.id,
        access_level=AccessLevel.ADMIN,
    )
    db.add(user_installation)
    
    # Create default components based on configuration
    if installation_data.has_battery:
        battery = Battery(
            installation_id=installation.id,
            capacity_kwh=10.0,  # Default, can be configured later
            evening_reserve_percentage=30.0,
            minimum_reserve_percentage=20.0,
            soc_percentage=0.0,
            current_power_kw=0.0,
        )
        db.add(battery)
    
    # Create inverters
    for i in range(1, installation_data.inverter_count + 1):
        inverter = Inverter(
            installation_id=installation.id,
            inverter_number=i,
            rated_power_kw=5.0,  # Default, can be configured later
            current_power_kw=0.0,
            curtailment_percentage=0.0,
        )
        db.add(inverter)
    
    # Create EV chargers if enabled
    if installation_data.has_ev_chargers and installation_data.charger_count > 0:
        for i in range(1, installation_data.charger_count + 1):
            ev_charger = EVCharger(
                installation_id=installation.id,
                charger_number=i,
                tariff_per_kwh=0.35,  # Default tariff, can be configured later
                session_active=False,
                session_energy_kwh=0.0,
                session_source=None,
                session_revenue_eur=0.0,
                total_revenue_eur=0.0,
                session_start_at=None,
            )
            db.add(ev_charger)

    # Create generator if enabled
    if installation_data.has_generator:
        generator = Generator(
            installation_id=installation.id,
            fuel_cost_per_liter=1.50,
            rated_power_kw=5.0,
            status=GeneratorStatus.OFF,
        )
        db.add(generator)

    # Create main meter
    main_meter = MainMeter(
        installation_id=installation.id,
        import_kw=0.0,
        export_kw=0.0,
        import_kwh_total=0.0,
        export_kwh_total=0.0,
        l1_current_a=0.0,
        l2_current_a=0.0,
        l3_current_a=0.0,
    )
    db.add(main_meter)

    await db.commit()
    await db.refresh(installation)
    return InstallationResponse.model_validate(installation)


@router.patch("/{installation_id}", response_model=InstallationResponse)
async def update_installation(
    installation_id: int,
    installation_data: InstallationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Update installation."""
    # Check access (need CONFIGURE level or admin)
    has_access = await check_installation_access(
        db, current_user, installation_id, required_level=AccessLevel.CONFIGURE
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Update fields
    if installation_data.name is not None:
        installation.name = installation_data.name
    
    if installation_data.country is not None:
        installation.country = installation_data.country
    if installation_data.state is not None:
        installation.state = installation_data.state
    if installation_data.city is not None:
        installation.city = installation_data.city
    if installation_data.timezone is not None:
        installation.timezone = installation_data.timezone
    if installation_data.has_pv is not None:
        installation.has_pv = installation_data.has_pv
    if installation_data.has_battery is not None:
        installation.has_battery = installation_data.has_battery
    if installation_data.has_generator is not None:
        installation.has_generator = installation_data.has_generator
    if installation_data.has_ev_chargers is not None:
        installation.has_ev_chargers = installation_data.has_ev_chargers
    if installation_data.inverter_count is not None:
        installation.inverter_count = installation_data.inverter_count
    if installation_data.charger_count is not None:
        installation.charger_count = installation_data.charger_count

    # Create or remove Inverter rows to match new inverter_count
    if installation_data.inverter_count is not None:
        inv_result = await db.execute(
            select(Inverter).where(
                Inverter.installation_id == installation_id,
                Inverter.deleted_at.is_(None),
            )
        )
        current_inverters = inv_result.scalars().all()
        new_inv_count = installation.inverter_count
        if new_inv_count > len(current_inverters):
            max_num = max((inv.inverter_number for inv in current_inverters), default=0)
            for i in range(max_num + 1, new_inv_count + 1):
                inverter = Inverter(
                    installation_id=installation_id,
                    inverter_number=i,
                    rated_power_kw=5.0,
                    current_power_kw=0.0,
                    curtailment_percentage=0.0,
                )
                db.add(inverter)
        elif new_inv_count < len(current_inverters):
            await db.execute(
                delete(Inverter).where(
                    Inverter.installation_id == installation_id,
                    Inverter.inverter_number > new_inv_count,
                )
            )

    # Create or remove EVCharger rows to match new charger_count (when has_ev_chargers)
    if installation_data.charger_count is not None and installation.has_ev_chargers:
        ch_result = await db.execute(
            select(EVCharger).where(
                EVCharger.installation_id == installation_id,
                EVCharger.deleted_at.is_(None),
            )
        )
        current_chargers = ch_result.scalars().all()
        new_ch_count = installation.charger_count
        if new_ch_count > len(current_chargers):
            max_num = max((ch.charger_number for ch in current_chargers), default=0)
            for i in range(max_num + 1, new_ch_count + 1):
                ev_charger = EVCharger(
                    installation_id=installation_id,
                    charger_number=i,
                    tariff_per_kwh=0.35,
                    session_active=False,
                    session_energy_kwh=0.0,
                    session_source=None,
                    session_revenue_eur=0.0,
                    total_revenue_eur=0.0,
                    session_start_at=None,
                )
                db.add(ev_charger)
        elif new_ch_count < len(current_chargers):
            await db.execute(
                delete(EVCharger).where(
                    EVCharger.installation_id == installation_id,
                    EVCharger.charger_number > new_ch_count,
                )
            )

    # Create, restore, or soft-delete Generator when has_generator changes
    if installation_data.has_generator is not None:
        gen_result = await db.execute(
            select(Generator).where(Generator.installation_id == installation_id)
        )
        existing_generator = gen_result.scalar_one_or_none()
        if installation.has_generator and not existing_generator:
            generator = Generator(
                installation_id=installation_id,
                fuel_cost_per_liter=1.50,
                rated_power_kw=5.0,
                status=GeneratorStatus.OFF,
            )
            db.add(generator)
        elif installation.has_generator and existing_generator and existing_generator.deleted_at is not None:
            existing_generator.deleted_at = None
        elif not installation.has_generator and existing_generator and existing_generator.deleted_at is None:
            existing_generator.deleted_at = datetime.utcnow()

    await db.commit()
    await db.refresh(installation)

    return InstallationResponse.model_validate(installation)


@router.patch("/{installation_id}/activate", response_model=InstallationResponse)
async def activate_installation(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Activate installation (admin only or installation admin)."""
    # Admin or installation admin can activate
    is_admin = current_user.role == UserRole.ADMIN
    has_admin_access = await check_installation_access(
        db, current_user, installation_id, required_level=AccessLevel.ADMIN
    )
    
    if not (is_admin or has_admin_access):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Reactivate (clear deleted_at)
    installation.deleted_at = None
    await db.commit()
    await db.refresh(installation)
    
    return InstallationResponse.model_validate(installation)


@router.patch("/{installation_id}/deactivate", response_model=InstallationResponse)
async def deactivate_installation(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Deactivate installation (soft delete) - admin only or installation admin."""
    # Admin or installation admin can deactivate
    is_admin = current_user.role == UserRole.ADMIN
    has_admin_access = await check_installation_access(
        db, current_user, installation_id, required_level=AccessLevel.ADMIN
    )
    
    if not (is_admin or has_admin_access):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Soft delete
    from datetime import datetime, timezone
    installation.deleted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(installation)
    
    return InstallationResponse.model_validate(installation)


@router.delete("/{installation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_installation(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Soft delete installation - admin only."""
    # Only admin can permanently delete
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Soft delete
    from datetime import datetime, timezone
    installation.deleted_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/location/countries", response_model=CountryList)
async def get_countries(
    current_user: Annotated[User, Depends(get_current_user)],
):
    """Get list of all countries."""
    countries = []
    for country in pycountry.countries:
        countries.append(Country(code=country.alpha_2, name=country.name))
    
    # Sort by name
    countries.sort(key=lambda x: x.name)
    return CountryList(countries=countries)


@router.get("/location/states", response_model=StateList)
async def get_states(
    current_user: Annotated[User, Depends(get_current_user)],
    country_code: str = Query(..., description="ISO 3166-1 alpha-2 country code"),
):
    """Get list of states/provinces for a country."""
    try:
        country = pycountry.countries.get(alpha_2=country_code.upper())
        if not country:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Country with code '{country_code}' not found",
            )
        
        states = []
        subdivisions = pycountry.subdivisions.get(country_code=country_code.upper())
        
        if subdivisions:
            for subdivision in subdivisions:
                states.append(State(code=subdivision.code.split('-')[-1] if '-' in subdivision.code else subdivision.code, name=subdivision.name))
        
        # Sort by name
        states.sort(key=lambda x: x.name)
        return StateList(states=states)
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Country with code '{country_code}' not found",
        )


@router.get("/location/cities", response_model=CityList)
async def get_cities_for_location(
    current_user: Annotated[User, Depends(get_current_user)],
    country_code: str = Query(..., description="ISO 3166-1 alpha-2 country code"),
    state_code: str | None = Query(None, description="State/province code (optional)"),
):
    """Get list of cities for a country and optionally a state."""
    try:
        country = pycountry.countries.get(alpha_2=country_code.upper())
        if not country:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Country with code '{country_code}' not found",
            )
        
        # Use OpenWeather Geocoding API to get cities
        # This is a free API that doesn't require additional packages
        cities = []
        seen_cities = set()
        
        # Build query for OpenWeather Geocoding API
        if state_code:
            # Try to get subdivision name
            subdivision = None
            try:
                subdivisions = pycountry.subdivisions.get(country_code=country_code.upper())
                if subdivisions:
                    for sub in subdivisions:
                        if sub.code.endswith(state_code.upper()) or sub.name.lower() == state_code.lower():
                            subdivision = sub
                            break
            except:
                pass
            
            if subdivision:
                query = f"{subdivision.name},{country.name}"
            else:
                query = f"{state_code},{country.name}"
        else:
            query = country.name
        
        # Use OpenWeather Geocoding API if API key is available
        if settings.OPEN_WEATHER_API_KEY:
            try:
                api_url = "https://api.openweathermap.org/geo/1.0/direct"
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.get(
                        api_url,
                        params={
                            "q": query,
                            "limit": 50,  # Get up to 50 results
                            "appid": settings.OPEN_WEATHER_API_KEY.strip(),
                        },
                    )
                    response.raise_for_status()
                    locations = response.json()
                    
                    for loc in locations:
                        city_name = loc.get("name", "")
                        loc_country = loc.get("country", "")
                        loc_state = loc.get("state", "")
                        
                        # Verify country matches
                        if loc_country.upper() != country_code.upper():
                            continue
                        
                        # Filter by state if provided
                        if state_code and loc_state:
                            if subdivision and loc_state.lower() != subdivision.name.lower():
                                continue
                            elif not subdivision and loc_state.lower() != state_code.lower():
                                continue
                        
                        if city_name and city_name not in seen_cities:
                            cities.append(City(name=city_name))
                            seen_cities.add(city_name)
            except Exception as e:
                logger.warning(f"Failed to fetch cities from OpenWeather API: {e}")
                # Fall through to basic list
        
        # Fallback: Return a basic list of major cities if API fails or no API key
        if not cities:
            # Common major cities by country (basic fallback)
            major_cities_by_country = {
                "NL": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
                "US": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix"],
                "GB": ["London", "Manchester", "Birmingham", "Liverpool", "Leeds"],
                "DE": ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne"],
                "FR": ["Paris", "Marseille", "Lyon", "Toulouse", "Nice"],
                "ES": ["Madrid", "Barcelona", "Valencia", "Seville", "Bilbao"],
                "IT": ["Rome", "Milan", "Naples", "Turin", "Palermo"],
                "BE": ["Brussels", "Antwerp", "Ghent", "Bruges", "Liège"],
            }
            
            country_cities = major_cities_by_country.get(country_code.upper(), [])
            for city_name in country_cities:
                cities.append(City(name=city_name))
        
        # Sort by name
        cities.sort(key=lambda x: x.name)
        return CityList(cities=cities)
    except Exception as e:
        logger.error(f"Error fetching cities: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching cities: {str(e)}",
        )


@router.get("/{installation_id}/weather", response_model=WeatherResponse)
async def get_installation_weather(
    installation_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Get weather forecast for installation location (today and tomorrow)."""
    # Check access
    has_access = await check_installation_access(db, current_user, installation_id)
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this installation",
        )
    
    # Get installation
    result = await db.execute(
        select(Installation).where(
            Installation.id == installation_id,
            Installation.deleted_at.is_(None),
        )
    )
    installation = result.scalar_one_or_none()
    
    if not installation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Installation not found",
        )
    
    # Check if API key is configured
    if not settings.OPEN_WEATHER_API_KEY:
        logger.warning("OpenWeather API key not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not configured. Please set OPEN_WEATHER_API_KEY environment variable.",
        )
    
    # Get timezone for installation
    try:
        tz = pytz.timezone(installation.timezone)
    except pytz.exceptions.UnknownTimeZoneError:
        # Fallback to UTC if timezone is invalid
        tz = pytz.UTC
    
    # Get current date in installation timezone
    now_utc = datetime.now(pytz.UTC)
    now_local = now_utc.astimezone(tz)
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    day_after_tomorrow_start = tomorrow_start + timedelta(days=1)
    
    # Convert to UTC for API calls
    today_start_utc = today_start.astimezone(pytz.UTC)
    tomorrow_start_utc = tomorrow_start.astimezone(pytz.UTC)
    day_after_tomorrow_start_utc = day_after_tomorrow_start.astimezone(pytz.UTC)
    
    # Date strings for cache keys
    today_date_str = today_start.date().isoformat()
    tomorrow_date_str = tomorrow_start.date().isoformat()
    
    # Build location string from city, state, country
    # Format: "{city},{state},{country_code}" or "{city},{country_code}" if state is null
    location_parts = [installation.city]
    if installation.state:
        location_parts.append(installation.state)
    location_parts.append(installation.country)
    location = ",".join(location_parts)
    
    # Check cache first
    cached_response = weather_cache.get(
        installation_id, location, today_date_str, tomorrow_date_str
    )
    if cached_response:
        logger.info(f"Returning cached weather data for installation {installation_id}")
        return cached_response
    
    # Clear expired cache entries periodically (every 10th request roughly)
    import random
    if random.random() < 0.1:  # 10% chance
        weather_cache.clear_expired()
    
    # Call OpenWeather API - using 5-day forecast API
    # Format: api.openweathermap.org/data/2.5/forecast?q={city name},{state},{country code}&appid={API key}
    api_url = "https://api.openweathermap.org/data/2.5/forecast"
    
    # Clean and validate API key
    api_key = settings.OPEN_WEATHER_API_KEY.strip() if settings.OPEN_WEATHER_API_KEY else None
    if not api_key:
        logger.error("OPEN_WEATHER_API_KEY is empty or not set")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Weather service is not configured. Please set OPEN_WEATHER_API_KEY environment variable.",
        )
    
    # Log API key info (masked for security)
    api_key_preview = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
    logger.info(f"Fetching weather for location: {location}, timezone: {installation.timezone}, API key: {api_key_preview}")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                api_url,
                params={
                    "q": location,
                    "appid": api_key,
                    "units": "metric",  # Get temperature in Celsius
                },
            )
            response.raise_for_status()
            weather_data = response.json()
            logger.debug(f"Weather API response received: {len(weather_data.get('list', []))} forecast items")
    except httpx.HTTPStatusError as e:
        error_detail = None
        error_code = None
        try:
            error_response = e.response.json()
            error_detail = error_response.get("message", error_response.get("cod", str(e)))
            error_code = error_response.get("cod")
            logger.error(f"OpenWeather API error response: {error_response}")
        except:
            error_detail = str(e)
            try:
                error_text = e.response.text[:200]  # First 200 chars
                logger.error(f"OpenWeather API error response (text): {error_text}")
            except:
                pass
        
        if e.response.status_code == 404:
            logger.warning(f"Location not found: {location}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Location '{location}' not found. Please check the installation location format (e.g., 'Amsterdam, Netherlands').",
            )
        elif e.response.status_code == 401 or (error_code and str(error_code) == "401"):
            logger.error(f"OpenWeather API authentication failed - invalid API key. Status: {e.response.status_code}, Code: {error_code}, Detail: {error_detail}")
            logger.error(f"API key length: {len(api_key)}, Preview: {api_key_preview}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Weather API authentication failed. Please verify your OPEN_WEATHER_API_KEY is correct. Error: {error_detail}",
            )
        else:
            logger.error(f"Weather API error {e.response.status_code}: {error_detail}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Weather API error ({e.response.status_code}): {error_detail}",
            )
    except httpx.TimeoutException:
        logger.error("Weather API request timeout")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Weather API request timeout. Please try again later.",
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching weather data: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to fetch weather data: {str(e)}",
        )
    
    # Parse forecast data to find today and tomorrow
    today_forecast = None
    tomorrow_forecast = None
    
    if "list" not in weather_data:
        logger.error(f"Invalid weather API response: missing 'list' key. Response keys: {weather_data.keys()}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Invalid weather API response format",
        )
    
    for forecast_item in weather_data["list"]:
        forecast_time = datetime.fromtimestamp(forecast_item["dt"], tz=pytz.UTC)
        
        # Find forecast closest to start of today (morning forecast)
        if today_forecast is None and forecast_time >= today_start_utc and forecast_time < tomorrow_start_utc:
            # Prefer forecasts around noon (12:00) for today
            if forecast_time.hour >= 9 and forecast_time.hour <= 15:
                today_forecast = forecast_item
        elif forecast_time >= tomorrow_start_utc and forecast_time < day_after_tomorrow_start_utc:
            # Prefer forecasts around noon (12:00) for tomorrow
            if tomorrow_forecast is None or (forecast_time.hour >= 9 and forecast_time.hour <= 15):
                tomorrow_forecast = forecast_item
    
    # Fallback: use first available forecast for each day
    if today_forecast is None:
        for forecast_item in weather_data["list"]:
            forecast_time = datetime.fromtimestamp(forecast_item["dt"], tz=pytz.UTC)
            if forecast_time >= today_start_utc and forecast_time < tomorrow_start_utc:
                today_forecast = forecast_item
                break
    
    if tomorrow_forecast is None:
        for forecast_item in weather_data["list"]:
            forecast_time = datetime.fromtimestamp(forecast_item["dt"], tz=pytz.UTC)
            if forecast_time >= tomorrow_start_utc and forecast_time < day_after_tomorrow_start_utc:
                tomorrow_forecast = forecast_item
                break
    
    # Helper function to map weather condition to icon
    def get_weather_icon(weather_main: str, weather_id: int) -> str:
        """Map OpenWeather condition to icon type."""
        weather_main_lower = weather_main.lower()
        
        # Check specific weather IDs for more accuracy
        if weather_id >= 200 and weather_id < 300:  # Thunderstorm
            return "rain"
        elif weather_id >= 300 and weather_id < 400:  # Drizzle
            return "rain"
        elif weather_id >= 500 and weather_id < 600:  # Rain
            return "rain"
        elif weather_id >= 600 and weather_id < 700:  # Snow
            return "snow"
        elif weather_id >= 700 and weather_id < 800:  # Atmosphere (fog, mist, etc.)
            return "cloud"
        elif weather_id == 800:  # Clear
            return "sun"
        elif weather_id >= 801 and weather_id <= 804:  # Clouds
            return "cloud"
        
        # Fallback to main condition
        if "rain" in weather_main_lower or "drizzle" in weather_main_lower:
            return "rain"
        elif "snow" in weather_main_lower:
            return "snow"
        elif "clear" in weather_main_lower or "sun" in weather_main_lower:
            return "sun"
        else:
            return "cloud"
    
    # Helper function to convert wind direction from degrees to cardinal direction
    def get_wind_direction(degrees: float) -> str:
        """Convert wind direction in degrees to cardinal direction."""
        directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        index = round(degrees / 45) % 8
        return directions[index]
    
    # Process today's forecast
    if not today_forecast:
        logger.warning(f"Today's forecast not found in API response. Available forecasts: {len(weather_data['list'])} items")
        # Try to use the first available forecast as fallback
        if weather_data["list"]:
            today_forecast = weather_data["list"][0]
            logger.info(f"Using first available forecast as today's forecast")
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Today's forecast not available in API response",
            )
    
    today_weather_main = today_forecast["weather"][0]["main"]
    today_weather_id = today_forecast["weather"][0]["id"]
    today_data = WeatherData(
        temperature=round(today_forecast["main"]["temp"], 1),
        wind_speed=round(today_forecast.get("wind", {}).get("speed", 0) * 3.6, 1),  # Convert m/s to km/h
        wind_direction=get_wind_direction(today_forecast.get("wind", {}).get("deg", 0)),
        rain_chance=round(today_forecast.get("pop", 0) * 100, 0),  # Probability of precipitation (0-1 to percentage)
        icon=get_weather_icon(today_weather_main, today_weather_id),
        date=today_start.date().isoformat(),
    )
    
    # Process tomorrow's forecast
    if not tomorrow_forecast:
        logger.warning(f"Tomorrow's forecast not found in API response")
        # Try to use the second available forecast as fallback
        if len(weather_data["list"]) > 1:
            tomorrow_forecast = weather_data["list"][1]
            logger.info(f"Using second available forecast as tomorrow's forecast")
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Tomorrow's forecast not available in API response",
            )
    
    tomorrow_weather_main = tomorrow_forecast["weather"][0]["main"]
    tomorrow_weather_id = tomorrow_forecast["weather"][0]["id"]
    tomorrow_data = WeatherData(
        temperature=round(tomorrow_forecast["main"]["temp"], 1),
        wind_speed=round(tomorrow_forecast.get("wind", {}).get("speed", 0) * 3.6, 1),  # Convert m/s to km/h
        wind_direction=get_wind_direction(tomorrow_forecast.get("wind", {}).get("deg", 0)),
        rain_chance=round(tomorrow_forecast.get("pop", 0) * 100, 0),  # Probability of precipitation (0-1 to percentage)
        icon=get_weather_icon(tomorrow_weather_main, tomorrow_weather_id),
        date=tomorrow_start.date().isoformat(),
    )
    
    weather_response = WeatherResponse(today=today_data, tomorrow=tomorrow_data)
    
    # Cache the response
    weather_cache.set(
        installation_id, location, today_date_str, tomorrow_date_str, weather_response
    )
    
    return weather_response

