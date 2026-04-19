"""Backfill generator rows for installations with has_generator=True

Revision ID: 20250222_1000
Revises: 20250214_1000
Create Date: 2025-02-22 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20250222_1000"
down_revision: Union[str, None] = "20250214_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            INSERT INTO generators (installation_id, fuel_cost_per_liter, rated_power_kw, status,
                                    fuel_consumption_lph, charging_power_kw, runtime_hours,
                                    created_at, updated_at)
            SELECT i.id, 1.50, 5.0, 'off', 0.0, 0.0, 0.0, NOW(), NOW()
            FROM installations i
            WHERE i.has_generator = TRUE
              AND i.deleted_at IS NULL
              AND NOT EXISTS (
                  SELECT 1 FROM generators g WHERE g.installation_id = i.id
              )
            """
        )
    )


def downgrade() -> None:
    pass
