"""v2.5.0: Create system_settings table for admin-configurable settings

Revision ID: 20251224_1000_v2.5.0
Revises: 20251223_1000_v2.4.0
Create Date: 2025-12-24 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20251224_1000_v2.5.0"
down_revision: Union[str, None] = "20251223_1000_v2.4.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'system_settings')"
        )
    )
    table_exists = result.scalar()
    
    if not table_exists:
        # Create system_settings table
        op.create_table(
            "system_settings",
            sa.Column("key", sa.String(length=100), nullable=False),
            sa.Column("value", sa.Text(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.PrimaryKeyConstraint("key"),
        )
    
    # Create index if not exists
    op.execute("CREATE INDEX IF NOT EXISTS ix_system_settings_key ON system_settings(key)")


def downgrade() -> None:
    op.drop_index("ix_system_settings_key", table_name="system_settings")
    op.drop_table("system_settings")

