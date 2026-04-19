"""Seed test data for development."""
import asyncio
from datetime import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

import sys
from pathlib import Path

# Add /app to path so backend.* imports work
# Script is at /app/scripts/seed_test_data.py, backend is at /app/backend
script_dir = Path(__file__).resolve().parent
app_dir = script_dir.parent  # /app
if str(app_dir) not in sys.path:
    sys.path.insert(0, str(app_dir))

from backend.config import settings
from backend.models import *
from backend.auth.password import hash_password
from backend.models.user import UserRole

async def seed_data():
    """Seed test data (idempotent - skips if already exists)."""
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if admin user already exists
        from sqlalchemy import select
        result = await session.execute(
            select(User).where(User.email == "admin@jsenergy.nl")
        )
        existing_admin = result.scalar_one_or_none()
        
        if existing_admin:
            print("Admin user already exists, skipping.")
        else:
            # Create admin user
            admin_user = User(
                email="admin@jsenergy.nl",
                password_hash=hash_password("admin123"),  # Change in production!
                role=UserRole.ADMIN,
                is_active=True,
                full_name="System Administrator",
                language_preference="nl",
            )
            session.add(admin_user)
            await session.commit()
            print("✅ Admin user created: admin@jsenergy.nl")
        
        # Create test user
        result = await session.execute(
            select(User).where(User.email == "testuser@example.com")
        )
        existing_testuser = result.scalar_one_or_none()
        
        if existing_testuser:
            print("Test user already exists, skipping.")
        else:
            test_user = User(
                email="testuser@example.com",
                password_hash=hash_password("super_secret"),
                role=UserRole.CUSTOMER,
                is_active=True,
                full_name="Test User",
                language_preference="nl",
            )
            session.add(test_user)
            await session.commit()
            print("✅ Test user created: testuser@example.com")
        
        # Check if test installation already exists
        result = await session.execute(
            select(Installation).where(Installation.name == "Test Installation")
        )
        existing_installation = result.scalar_one_or_none()
        
        if existing_installation:
            print("Test installation already exists, skipping.")
            return
        
        # Create test installation
        installation = Installation(
            name="Test Installation",
            location="Amsterdam, Netherlands",
            timezone="Europe/Amsterdam",
            has_pv=True,
            has_battery=True,
            has_generator=False,
            has_ev_chargers=False,
            inverter_count=2,
            charger_count=0,
        )
        session.add(installation)
        await session.commit()
        
        # Create battery
        battery = Battery(
            installation_id=installation.id,
            capacity_kwh=10.0,
            evening_reserve_percentage=30.0,
            minimum_reserve_percentage=20.0,
            soc_percentage=50.0,
            current_power_kw=0.0,
        )
        session.add(battery)
        
        # Create inverters
        for i in range(1, 3):
            inverter = Inverter(
                installation_id=installation.id,
                inverter_number=i,
                rated_power_kw=5.0,
                current_power_kw=0.0,
            )
            session.add(inverter)
        
        # Create main meter
        meter = MainMeter(
            installation_id=installation.id,
            import_kw=0.0,
            export_kw=0.0,
        )
        session.add(meter)
        
        await session.commit()
        print("✅ Test data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

