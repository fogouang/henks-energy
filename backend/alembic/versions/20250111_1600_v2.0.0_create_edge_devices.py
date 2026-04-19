"""v2.0.0: Create edge_devices table

Revision ID: 20250111_1600_v2.0.0
Revises: 20250109_1520_v2.0.0
Create Date: 2025-01-11 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250111_1600_v2.0.0"
down_revision: Union[str, None] = "20250109_1520_v2.0.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists using raw SQL (works with async connections)
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'edge_devices')"
        )
    )
    # Get scalar value
    table_exists = result.scalar()
    
    if not table_exists:
        # Edge Devices
        op.create_table(
            "edge_devices",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("installation_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=255), nullable=False),
            sa.Column("token", sa.String(length=255), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
            sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        )
    
    # Check and create indexes only if they don't exist
    # Table should exist at this point (either it existed before or we just created it)
    # Use IF NOT EXISTS pattern via raw SQL for indexes
    # Note: asyncpg doesn't support multiple statements in one execute, so we do them separately
    op.execute("CREATE INDEX IF NOT EXISTS ix_edge_devices_installation_id ON edge_devices(installation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_edge_devices_name ON edge_devices(name)")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_edge_devices_token ON edge_devices(token)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_edge_device_installation ON edge_devices(installation_id)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_edge_device_token ON edge_devices(token)")


def downgrade() -> None:
    op.drop_index("idx_edge_device_token", table_name="edge_devices")
    op.drop_index("idx_edge_device_installation", table_name="edge_devices")
    op.drop_index(op.f("ix_edge_devices_token"), table_name="edge_devices")
    op.drop_index(op.f("ix_edge_devices_name"), table_name="edge_devices")
    op.drop_index(op.f("ix_edge_devices_installation_id"), table_name="edge_devices")
    op.drop_table("edge_devices")

