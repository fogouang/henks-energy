"""Allow duplicate installation names: drop unique constraint on installations.name

Revision ID: 20250214_1000
Revises: 20251224_1000_v2.5.0
Create Date: 2025-02-14 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20250214_1000"
down_revision: Union[str, None] = "20251224_1000_v2.5.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the unique index on name, then create a non-unique index for query performance
    op.drop_index(op.f("ix_installations_name"), table_name="installations")
    op.create_index(
        op.f("ix_installations_name"),
        "installations",
        ["name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_installations_name"), table_name="installations")
    op.create_index(
        op.f("ix_installations_name"),
        "installations",
        ["name"],
        unique=True,
    )
