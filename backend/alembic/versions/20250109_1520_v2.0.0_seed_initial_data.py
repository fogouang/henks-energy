"""v2.0.0: Seed initial data (admin user, test installation)

Revision ID: 20250109_1520_v2.0.0
Revises: 20250109_1515_v2.0.0
Create Date: 2025-01-09 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250109_1520_v2.0.0"
down_revision: Union[str, None] = "20250109_1515_v2.0.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Note: Password hash should be generated using bcrypt
    # This is a placeholder - actual hash should be generated in seed script
    # Default password: "admin123" (CHANGE IN PRODUCTION)
    # Hash for "admin123": $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5GyY5GyY5
    
    # Create default admin user
    op.execute("""
        INSERT INTO users (email, password_hash, role, is_active, full_name, language_preference, created_at, updated_at)
        VALUES (
            'admin@jsenergy.nl',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyY5GyY5GyY5',
            'admin',
            true,
            'System Administrator',
            'nl',
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO NOTHING;
    """)
    
    # Create test installation (MVP mode)
    op.execute("""
        INSERT INTO installations (name, location, timezone, has_pv, has_battery, has_generator, has_ev_chargers, inverter_count, charger_count, created_at, updated_at)
        VALUES (
            'Test Installation',
            'Amsterdam, Netherlands',
            'Europe/Amsterdam',
            true,
            true,
            false,
            false,
            2,
            0,
            NOW(),
            NOW()
        )
        ON CONFLICT (name) DO NOTHING;
    """)
    
    # Get installation ID and create components
    op.execute("""
        DO $$
        DECLARE
            inst_id INTEGER;
            user_id INTEGER;
        BEGIN
            SELECT id INTO inst_id FROM installations WHERE name = 'Test Installation' LIMIT 1;
            SELECT id INTO user_id FROM users WHERE email = 'admin@jsenergy.nl' LIMIT 1;
            
            IF inst_id IS NOT NULL THEN
                -- Create battery
                INSERT INTO batteries (installation_id, capacity_kwh, evening_reserve_percentage, minimum_reserve_percentage, soc_percentage, current_power_kw, status, created_at, updated_at)
                VALUES (inst_id, 10.0, 30.0, 20.0, 50.0, 0.0, 'idle', NOW(), NOW())
                ON CONFLICT DO NOTHING;
                
                -- Create inverters (2 for MVP)
                INSERT INTO inverters (installation_id, inverter_number, rated_power_kw, current_power_kw, curtailment_percentage, status, created_at, updated_at)
                VALUES 
                    (inst_id, 1, 5.0, 0.0, 0.0, 'active', NOW(), NOW()),
                    (inst_id, 2, 5.0, 0.0, 0.0, 'active', NOW(), NOW())
                ON CONFLICT DO NOTHING;
                
                -- Create main meter
                INSERT INTO main_meters (installation_id, import_kw, export_kw, import_kwh_total, export_kwh_total, l1_current_a, l2_current_a, l3_current_a, created_at, updated_at)
                VALUES (inst_id, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, NOW(), NOW())
                ON CONFLICT DO NOTHING;
                
                -- Grant admin access to installation
                IF user_id IS NOT NULL THEN
                    INSERT INTO user_installations (user_id, installation_id, access_level, granted_at, created_at, updated_at)
                    VALUES (user_id, inst_id, 'admin', NOW(), NOW(), NOW())
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Remove test data
    op.execute("DELETE FROM user_installations WHERE installation_id IN (SELECT id FROM installations WHERE name = 'Test Installation');")
    op.execute("DELETE FROM main_meters WHERE installation_id IN (SELECT id FROM installations WHERE name = 'Test Installation');")
    op.execute("DELETE FROM inverters WHERE installation_id IN (SELECT id FROM installations WHERE name = 'Test Installation');")
    op.execute("DELETE FROM batteries WHERE installation_id IN (SELECT id FROM installations WHERE name = 'Test Installation');")
    op.execute("DELETE FROM installations WHERE name = 'Test Installation';")
    op.execute("DELETE FROM users WHERE email = 'admin@jsenergy.nl';")

