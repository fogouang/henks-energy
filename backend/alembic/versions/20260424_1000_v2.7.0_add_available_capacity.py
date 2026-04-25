"""v2.7.0: Add available_capacity to battery_measurements
Revision ID: 20260424_1000_v2.7.0
Revises: 20250222_1000
Create Date: 2026-04-24 10:00:00.000000
"""
from typing import Sequence, Tuple, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260424_1000_v2.7.0"
down_revision: Union[str, Tuple[str, ...], None] = ("20250222_1000", "20260419_1000_v2.6.0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "battery_measurements",
        sa.Column("available_capacity", sa.Float(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("battery_measurements", "available_capacity")