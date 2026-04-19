"""v2.3.0: Create firmware table for edge device firmware management

Revision ID: 20250117_1000_v2.3.0
Revises: 20250112_1100_v2.2.0
Create Date: 2025-01-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250117_1000_v2.3.0"
down_revision: Union[str, None] = "20250112_1100_v2.2.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if table already exists using raw SQL (works with async connections)
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'firmware')"
        )
    )
    table_exists = result.scalar()
    
    if not table_exists:
        # Firmware table for edge device firmware management
        op.create_table(
            "firmware",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("version", sa.String(length=50), nullable=False),
            sa.Column("build_number", sa.Integer(), nullable=False),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("file_path", sa.String(length=512), nullable=False),
            sa.Column("file_size", sa.BigInteger(), nullable=False),
            sa.Column("checksum", sa.String(length=64), nullable=False),  # SHA256 hex
            sa.Column("release_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
            sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    
    # Create indexes only if they don't exist
    op.execute("CREATE INDEX IF NOT EXISTS ix_firmware_version ON firmware(version)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_firmware_build_number ON firmware(build_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_firmware_version_build ON firmware(version, build_number)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_firmware_created_at ON firmware(created_at)")


def downgrade() -> None:
    op.drop_index("idx_firmware_created_at", table_name="firmware")
    op.drop_index("idx_firmware_version_build", table_name="firmware")
    op.drop_index("ix_firmware_build_number", table_name="firmware")
    op.drop_index("ix_firmware_version", table_name="firmware")
    op.drop_table("firmware")

