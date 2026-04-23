"""v2.6.0: Restructure epex_spot_prices table
Revision ID: 20260419_1000_v2.6.0
Revises: 20250222_1000
Create Date: 2026-04-19 10:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "20260419_1000_v2.6.0"
down_revision: Union[str, None] = "20250222_1000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()
    connection.execute(sa.text("DROP TABLE IF EXISTS epex_spot_prices CASCADE"))
    op.create_table(
        "epex_spot_prices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("date_hour", sa.DateTime(timezone=True), nullable=False),
        sa.Column("price", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("date_hour", name="uq_epex_date_hour"),
    )
    op.create_index("ix_epex_date_hour", "epex_spot_prices", ["date_hour"])


def downgrade() -> None:
    op.drop_index("ix_epex_date_hour", table_name="epex_spot_prices")
    op.drop_table("epex_spot_prices")