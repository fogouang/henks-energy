"""v2.4.0: Update reverse_ssh table - remove remote_port, make host/user nullable

Revision ID: 20251223_1000_v2.4.0
Revises: 20250117_1000_v2.3.0
Create Date: 2025-12-23 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20251223_1000_v2.4.0"
down_revision: Union[str, None] = "20250117_1000_v2.3.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if reverse_ssh table exists
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reverse_ssh')"
        )
    )
    table_exists = result.scalar()
    
    if table_exists:
        # Check if remote_port column exists before trying to drop it
        result = connection.execute(
            sa.text(
                "SELECT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'reverse_ssh' AND column_name = 'remote_port')"
            )
        )
        column_exists = result.scalar()
        
        if column_exists:
            # Drop the check constraint for remote_port
            op.execute("ALTER TABLE reverse_ssh DROP CONSTRAINT IF EXISTS check_remote_port_range")
            
            # Drop the remote_port column
            op.drop_column("reverse_ssh", "remote_port")
        
        # Make host column nullable
        op.alter_column(
            "reverse_ssh",
            "host",
            existing_type=sa.String(length=255),
            nullable=True,
        )
        
        # Make user column nullable
        op.alter_column(
            "reverse_ssh",
            "user",
            existing_type=sa.String(length=100),
            nullable=True,
        )


def downgrade() -> None:
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reverse_ssh')"
        )
    )
    table_exists = result.scalar()
    
    if table_exists:
        # Make user column non-nullable (set NULL values to default first)
        op.execute("UPDATE reverse_ssh SET \"user\" = 'rpi-tunnel' WHERE \"user\" IS NULL")
        op.alter_column(
            "reverse_ssh",
            "user",
            existing_type=sa.String(length=100),
            nullable=False,
        )
        
        # Make host column non-nullable (set NULL values to default first)
        op.execute("UPDATE reverse_ssh SET host = 'support.jsenergy.nl' WHERE host IS NULL")
        op.alter_column(
            "reverse_ssh",
            "host",
            existing_type=sa.String(length=255),
            nullable=False,
        )
        
        # Re-add remote_port column with a default value
        op.add_column(
            "reverse_ssh",
            sa.Column("remote_port", sa.Integer(), nullable=False, server_default="2200"),
        )
        
        # Re-add the check constraint
        op.create_check_constraint(
            "check_remote_port_range",
            "reverse_ssh",
            "remote_port >= 1 AND remote_port <= 65535",
        )

