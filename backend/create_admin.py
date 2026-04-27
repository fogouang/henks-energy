import asyncio
import sys
sys.path.insert(0, '.')

from dotenv import load_dotenv
load_dotenv('.env')

from database import AsyncSessionLocal
from models.user import User, UserRole
from auth.password import hash_password
from sqlalchemy import select

async def create_admin():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == 'admin@jsenergy.nl'))
        if result.scalar_one_or_none():
            print('User already exists')
            return
        user = User(
            email='admin@jsenergy.nl',
            hashed_password=hash_password('admin123'),
            full_name='Admin',
            role=UserRole.ADMIN,
            is_active=True
        )
        session.add(user)
        await session.commit()
        print('✅ Admin created: admin@jsenergy.nl / admin123')

asyncio.run(create_admin())