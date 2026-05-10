"""v2.8.0 add usable to battery_measurements"""

from alembic import op
import sqlalchemy as sa

revision = '20260510_1000'
down_revision = '20260424_1000_v2.7.0'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('battery_measurements',
        sa.Column('usable', sa.Float(), nullable=True)
    )

def downgrade():
    op.drop_column('battery_measurements', 'usable')
