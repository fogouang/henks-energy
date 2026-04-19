"""Seed dummy measurement data for all installations with edge devices."""
import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete, text

import sys
from pathlib import Path

# Add /app to path so backend.* imports work
script_dir = Path(__file__).resolve().parent
app_dir = script_dir.parent
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from backend.config import settings
from backend.models import (
    Installation,
    Battery,
    Inverter,
    EVCharger,
    MainMeter,
    EdgeDevice,
    BatteryMeasurement,
    MeterMeasurement,
    InverterMeasurement,
    EVChargerMeasurement,
)

NUM_DATA_POINTS = 500  # Number of measurement points to generate
INTERVAL_MINUTES = 5   # Time between measurements


def generate_realistic_solar_power(hour: int, rated_power: float) -> float:
    """Generate realistic solar power based on time of day."""
    if hour < 6 or hour > 20:
        return 0.0
    # Peak at noon
    peak_factor = 1 - abs(hour - 13) / 8
    base_power = rated_power * peak_factor * 0.8
    # Add some randomness for cloud cover
    variation = random.uniform(0.7, 1.1)
    return max(0, base_power * variation)


def generate_battery_soc(prev_soc: float, power: float, capacity: float, dt_hours: float) -> float:
    """Update battery SoC based on power flow."""
    # power > 0 = charging, power < 0 = discharging
    energy_change = power * dt_hours  # kWh
    soc_change = (energy_change / capacity) * 100  # percentage
    new_soc = prev_soc + soc_change
    return max(20, min(100, new_soc))  # Clamp between 20% and 100%


async def seed_device_37_data():
    """Seed measurement data for installation 37."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if installation 37 exists
        result = await session.execute(
            select(Installation).where(Installation.id == INSTALLATION_ID)
        )
        installation = result.scalar_one_or_none()
        
        if not installation:
            print(f"❌ Installation {INSTALLATION_ID} not found!")
            print("Creating installation 37...")
            
            installation = Installation(
                id=INSTALLATION_ID,
                name="Demo Installation 37",
                location="Amsterdam, Netherlands",
                timezone="Europe/Amsterdam",
                has_pv=True,
                has_battery=True,
                has_generator=False,
                has_ev_chargers=True,
                inverter_count=2,
                charger_count=2,
            )
            session.add(installation)
            await session.commit()
            print(f"✅ Created installation {INSTALLATION_ID}")
        
        # Check/create battery
        result = await session.execute(
            select(Battery).where(Battery.installation_id == INSTALLATION_ID)
        )
        battery = result.scalar_one_or_none()
        
        if not battery:
            battery = Battery(
                installation_id=INSTALLATION_ID,
                capacity_kwh=10.0,
                evening_reserve_percentage=30.0,
                minimum_reserve_percentage=20.0,
                soc_percentage=65.0,
                current_power_kw=0.0,
            )
            session.add(battery)
            await session.commit()
            print(f"✅ Created battery for installation {INSTALLATION_ID}")
        
        # Check/create inverters
        result = await session.execute(
            select(Inverter).where(Inverter.installation_id == INSTALLATION_ID)
        )
        inverters = result.scalars().all()
        
        if not inverters:
            for i in range(1, 3):
                inverter = Inverter(
                    installation_id=INSTALLATION_ID,
                    inverter_number=i,
                    rated_power_kw=5.0,
                    current_power_kw=0.0,
                )
                session.add(inverter)
            await session.commit()
            
            # Re-fetch inverters
            result = await session.execute(
                select(Inverter).where(Inverter.installation_id == INSTALLATION_ID)
            )
            inverters = result.scalars().all()
            print(f"✅ Created {len(inverters)} inverters for installation {INSTALLATION_ID}")
        
        # Check/create EV chargers
        result = await session.execute(
            select(EVCharger).where(EVCharger.installation_id == INSTALLATION_ID)
        )
        chargers = result.scalars().all()
        
        if not chargers:
            for i in range(1, 3):
                charger = EVCharger(
                    installation_id=INSTALLATION_ID,
                    charger_number=i,
                    tariff_per_kwh=0.35,
                    session_active=False,
                    session_energy_kwh=0.0,
                    total_revenue_eur=0.0,
                )
                session.add(charger)
            await session.commit()
            
            result = await session.execute(
                select(EVCharger).where(EVCharger.installation_id == INSTALLATION_ID)
            )
            chargers = result.scalars().all()
            print(f"✅ Created {len(chargers)} EV chargers for installation {INSTALLATION_ID}")
        
        # Check/create main meter
        result = await session.execute(
            select(MainMeter).where(MainMeter.installation_id == INSTALLATION_ID)
        )
        main_meter = result.scalar_one_or_none()
        
        if not main_meter:
            main_meter = MainMeter(
                installation_id=INSTALLATION_ID,
                import_kw=0.0,
                export_kw=0.0,
            )
            session.add(main_meter)
            await session.commit()
            print(f"✅ Created main meter for installation {INSTALLATION_ID}")
        
        # Clear existing measurements for clean slate
        print(f"\n🗑️  Clearing existing measurements for installation {INSTALLATION_ID}...")
        await session.execute(
            delete(BatteryMeasurement).where(BatteryMeasurement.installation_id == INSTALLATION_ID)
        )
        await session.execute(
            delete(MeterMeasurement).where(MeterMeasurement.installation_id == INSTALLATION_ID)
        )
        await session.execute(
            delete(InverterMeasurement).where(InverterMeasurement.installation_id == INSTALLATION_ID)
        )
        await session.execute(
            delete(EVChargerMeasurement).where(EVChargerMeasurement.installation_id == INSTALLATION_ID)
        )
        await session.commit()
        
        # Generate measurement data
        print(f"\n📊 Generating {NUM_DATA_POINTS} measurement points...")
        
        # Start from 2 days ago - use timezone-aware datetime
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(minutes=INTERVAL_MINUTES * NUM_DATA_POINTS)
        
        current_time = start_time
        battery_soc = 65.0  # Starting SoC
        cumulative_import_kwh = 0.0
        cumulative_export_kwh = 0.0
        cumulative_ev_revenue = 0.0
        
        battery_measurements = []
        meter_measurements = []
        inverter_measurements = []
        ev_measurements = []
        
        for i in range(NUM_DATA_POINTS):
            hour = current_time.hour
            dt_hours = INTERVAL_MINUTES / 60
            
            # Generate solar power for each inverter
            total_solar = 0.0
            for inv in inverters:
                solar_power = generate_realistic_solar_power(hour, inv.rated_power_kw)
                total_solar += solar_power
                
                inverter_measurements.append(
                    InverterMeasurement(
                        timestamp=current_time,
                        installation_id=INSTALLATION_ID,
                        inverter_id=inv.id,
                        power_kw=solar_power,
                        energy_kwh_daily=solar_power * dt_hours,
                        curtailment_percentage=random.uniform(0, 5) if solar_power > 4 else 0,
                    )
                )
            
            # Generate household consumption (higher in morning and evening)
            if 6 <= hour <= 9 or 17 <= hour <= 22:
                consumption = random.uniform(2.0, 4.0)
            elif 9 < hour < 17:
                consumption = random.uniform(0.5, 1.5)
            else:
                consumption = random.uniform(0.3, 0.8)
            
            # EV charging simulation (random sessions)
            ev_power = 0.0
            for charger in chargers:
                # 10% chance of EV charging during any interval
                if random.random() < 0.1:
                    charger_power = random.uniform(3.0, 7.0)
                    ev_power += charger_power
                    revenue = charger_power * dt_hours * 0.35
                    cumulative_ev_revenue += revenue
                    
                    ev_measurements.append(
                        EVChargerMeasurement(
                            timestamp=current_time,
                            installation_id=INSTALLATION_ID,
                            charger_id=charger.id,
                            power_kw=charger_power,
                            energy_kwh=charger_power * dt_hours,
                            source="battery" if battery_soc > 50 else "grid",
                            revenue_eur=revenue,
                        )
                    )
            
            # Calculate net power flow
            total_consumption = consumption + ev_power
            net_power = total_solar - total_consumption
            
            # Battery logic
            if net_power > 0 and battery_soc < 100:
                # Excess solar - charge battery
                battery_power = min(net_power, 5.0)  # Max 5kW charging
                battery_soc = generate_battery_soc(battery_soc, battery_power, 10.0, dt_hours)
                grid_export = max(0, net_power - battery_power)
                grid_import = 0.0
            elif net_power < 0 and battery_soc > 20:
                # Deficit - discharge battery
                battery_power = max(net_power, -5.0)  # Max 5kW discharging
                battery_soc = generate_battery_soc(battery_soc, battery_power, 10.0, dt_hours)
                remaining_deficit = abs(net_power) - abs(battery_power)
                grid_import = max(0, remaining_deficit)
                grid_export = 0.0
            else:
                # No battery action
                battery_power = 0.0
                if net_power > 0:
                    grid_export = net_power
                    grid_import = 0.0
                else:
                    grid_import = abs(net_power)
                    grid_export = 0.0
            
            cumulative_import_kwh += grid_import * dt_hours
            cumulative_export_kwh += grid_export * dt_hours
            
            # Battery measurement
            battery_measurements.append(
                BatteryMeasurement(
                    timestamp=current_time,
                    installation_id=INSTALLATION_ID,
                    soc_percentage=battery_soc,
                    power_kw=battery_power,
                    voltage=random.uniform(48.0, 52.0),
                    temperature=random.uniform(20.0, 35.0),
                )
            )
            
            # Meter measurement
            l1_current = random.uniform(0.5, 3.0) if grid_import > 0 else random.uniform(0.1, 1.0)
            l2_current = random.uniform(0.5, 3.0) if grid_import > 0 else random.uniform(0.1, 1.0)
            l3_current = random.uniform(0.5, 3.0) if grid_import > 0 else random.uniform(0.1, 1.0)
            
            meter_measurements.append(
                MeterMeasurement(
                    timestamp=current_time,
                    installation_id=INSTALLATION_ID,
                    import_kw=grid_import,
                    export_kw=grid_export,
                    import_kwh=cumulative_import_kwh,
                    export_kwh=cumulative_export_kwh,
                    l1_a=l1_current,
                    l2_a=l2_current,
                    l3_a=l3_current,
                )
            )
            
            current_time += timedelta(minutes=INTERVAL_MINUTES)
            
            # Progress indicator
            if (i + 1) % 100 == 0:
                print(f"  Generated {i + 1}/{NUM_DATA_POINTS} points...")
        
        # Bulk insert all measurements using raw SQL for hypertables
        print("\n💾 Inserting measurements into database...")
        
        # Insert battery measurements
        if battery_measurements:
            battery_values = ", ".join([
                f"('{m.timestamp.isoformat()}', {m.installation_id}, {m.soc_percentage}, {m.power_kw}, {m.voltage}, {m.temperature})"
                for m in battery_measurements
            ])
            await session.execute(text(f"""
                INSERT INTO battery_measurements (timestamp, installation_id, soc_percentage, power_kw, voltage, temperature)
                VALUES {battery_values}
                ON CONFLICT DO NOTHING
            """))
        
        # Insert meter measurements
        if meter_measurements:
            meter_values = ", ".join([
                f"('{m.timestamp.isoformat()}', {m.installation_id}, {m.import_kw}, {m.export_kw}, {m.import_kwh}, {m.export_kwh}, {m.l1_a}, {m.l2_a}, {m.l3_a})"
                for m in meter_measurements
            ])
            await session.execute(text(f"""
                INSERT INTO meter_measurements (timestamp, installation_id, import_kw, export_kw, import_kwh, export_kwh, l1_a, l2_a, l3_a)
                VALUES {meter_values}
                ON CONFLICT DO NOTHING
            """))
        
        # Insert inverter measurements in batches
        if inverter_measurements:
            batch_size = 100
            for i in range(0, len(inverter_measurements), batch_size):
                batch = inverter_measurements[i:i + batch_size]
                inverter_values = ", ".join([
                    f"('{m.timestamp.isoformat()}', {m.installation_id}, {m.inverter_id}, {m.power_kw}, {m.energy_kwh_daily}, {m.curtailment_percentage})"
                    for m in batch
                ])
                await session.execute(text(f"""
                    INSERT INTO inverter_measurements (timestamp, installation_id, inverter_id, power_kw, energy_kwh_daily, curtailment_percentage)
                    VALUES {inverter_values}
                    ON CONFLICT DO NOTHING
                """))
        
        # Insert EV measurements
        if ev_measurements:
            ev_values = ", ".join([
                f"('{m.timestamp.isoformat()}', {m.installation_id}, {m.charger_id}, {m.power_kw}, {m.energy_kwh}, '{m.source}', {m.revenue_eur})"
                for m in ev_measurements
            ])
            await session.execute(text(f"""
                INSERT INTO ev_charger_measurements (timestamp, installation_id, charger_id, power_kw, energy_kwh, source, revenue_eur)
                VALUES {ev_values}
                ON CONFLICT DO NOTHING
            """))
        
        await session.commit()
        
        # Update current state
        battery.soc_percentage = battery_soc
        battery.current_power_kw = battery_measurements[-1].power_kw if battery_measurements else 0.0
        
        if main_meter:
            main_meter.import_kw = meter_measurements[-1].import_kw if meter_measurements else 0.0
            main_meter.export_kw = meter_measurements[-1].export_kw if meter_measurements else 0.0
            main_meter.import_kwh_total = cumulative_import_kwh
            main_meter.export_kwh_total = cumulative_export_kwh
            main_meter.l1_current_a = meter_measurements[-1].l1_a if meter_measurements else 0.0
            main_meter.l2_current_a = meter_measurements[-1].l2_a if meter_measurements else 0.0
            main_meter.l3_current_a = meter_measurements[-1].l3_a if meter_measurements else 0.0
        
        for inv in inverters:
            inv.current_power_kw = generate_realistic_solar_power(datetime.now().hour, inv.rated_power_kw)
        
        # Update EV charger totals
        for charger in chargers:
            # Calculate total revenue for this charger from ev_measurements
            charger_revenue = sum(
                m.revenue_eur for m in ev_measurements 
                if m.charger_id == charger.id
            )
            charger_energy = sum(
                m.energy_kwh for m in ev_measurements 
                if m.charger_id == charger.id
            )
            charger.total_revenue_eur = charger_revenue
            charger.session_energy_kwh = charger_energy
        
        await session.commit()
        
        print(f"\n✅ Successfully seeded data for installation {INSTALLATION_ID}!")
        print(f"   - Battery measurements: {len(battery_measurements)}")
        print(f"   - Meter measurements: {len(meter_measurements)}")
        print(f"   - Inverter measurements: {len(inverter_measurements)}")
        print(f"   - EV charger measurements: {len(ev_measurements)}")
        print(f"\n   Time range: {start_time} to {end_time}")
        print(f"   Final battery SoC: {battery_soc:.1f}%")
        print(f"   Total import: {cumulative_import_kwh:.2f} kWh")
        print(f"   Total export: {cumulative_export_kwh:.2f} kWh")


if __name__ == "__main__":
    asyncio.run(seed_device_37_data())
