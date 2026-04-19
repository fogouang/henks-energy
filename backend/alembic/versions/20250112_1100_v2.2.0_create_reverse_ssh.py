"""v2.2.0: Create reverse_ssh table

Revision ID: 20250112_1100_v2.2.0
Revises: 20250112_1000_v2.1.0
Create Date: 2025-01-12 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250112_1100_v2.2.0"
down_revision: Union[str, None] = "20250112_1000_v2.1.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists using raw SQL (works with async connections)
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reverse_ssh')"
        )
    )
    # Get scalar value
    table_exists = result.scalar()
    
    if not table_exists:
        # Reverse SSH Configuration
        op.create_table(
            "reverse_ssh",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("device_id", sa.Integer(), nullable=False),
            sa.Column("enabled", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("host", sa.String(length=255), nullable=False),
            sa.Column("user", sa.String(length=100), nullable=False),
            sa.Column("ssh_port", sa.Integer(), nullable=False, server_default="22"),
            sa.Column("remote_port", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.ForeignKeyConstraint(["device_id"], ["edge_devices.id"], ondelete="CASCADE"),
            sa.UniqueConstraint("device_id"),
            sa.CheckConstraint("ssh_port >= 1 AND ssh_port <= 65535", name="check_ssh_port_range"),
            sa.CheckConstraint("remote_port >= 1 AND remote_port <= 65535", name="check_remote_port_range"),
        )
    
    # Check and create indexes only if they don't exist
    op.execute("CREATE INDEX IF NOT EXISTS ix_reverse_ssh_device_id ON reverse_ssh(device_id)")


def downgrade() -> None:
    op.drop_index("ix_reverse_ssh_device_id", table_name="reverse_ssh")
    op.drop_table("reverse_ssh")

