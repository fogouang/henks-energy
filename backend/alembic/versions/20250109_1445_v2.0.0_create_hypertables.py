"""v2.0.0: Create TimescaleDB hypertables

Revision ID: 20250109_1445_v2.0.0
Revises: 20250109_1430_v2.0.0
Create Date: 2025-01-09 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20250109_1445_v2.0.0"
down_revision: Union[str, None] = "20250109_1430_v2.0.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Enable TimescaleDB extension
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")

    # Create measurement tables (hypertables)
    
    # Battery Measurements
    op.create_table(
        "battery_measurements",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("soc_percentage", sa.Float(), nullable=False),
        sa.Column("power_kw", sa.Float(), nullable=False),
        sa.Column("voltage", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timestamp", "installation_id"),
    )
    op.create_index("idx_battery_installation_timestamp", "battery_measurements", ["installation_id", "timestamp"])
    op.execute(
        "SELECT create_hypertable('battery_measurements', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # Inverter Measurements
    op.create_table(
        "inverter_measurements",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("inverter_id", sa.Integer(), nullable=False),
        sa.Column("power_kw", sa.Float(), nullable=False),
        sa.Column("energy_kwh_daily", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("curtailment_percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["inverter_id"], ["inverters.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timestamp", "installation_id", "inverter_id"),
    )
    op.create_index(
        "idx_inverter_installation_timestamp",
        "inverter_measurements",
        ["installation_id", "inverter_id", "timestamp"],
    )
    op.execute(
        "SELECT create_hypertable('inverter_measurements', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # Meter Measurements
    op.create_table(
        "meter_measurements",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("import_kw", sa.Float(), nullable=False),
        sa.Column("export_kw", sa.Float(), nullable=False),
        sa.Column("import_kwh", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("export_kwh", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l1_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l2_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l3_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timestamp", "installation_id"),
    )
    op.create_index("idx_meter_installation_timestamp", "meter_measurements", ["installation_id", "timestamp"])
    op.execute(
        "SELECT create_hypertable('meter_measurements', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # Generator Measurements
    op.create_table(
        "generator_measurements",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("fuel_consumption_lph", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("charging_power_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timestamp", "installation_id"),
    )
    op.create_index(
        "idx_generator_installation_timestamp",
        "generator_measurements",
        ["installation_id", "timestamp"],
    )
    op.execute(
        "SELECT create_hypertable('generator_measurements', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # EV Charger Measurements
    op.create_table(
        "ev_charger_measurements",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("charger_id", sa.Integer(), nullable=False),
        sa.Column("power_kw", sa.Float(), nullable=False),
        sa.Column("energy_kwh", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("source", sa.String(length=20), nullable=False),
        sa.Column("revenue_eur", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["charger_id"], ["ev_chargers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("timestamp", "installation_id", "charger_id"),
    )
    op.create_index(
        "idx_ev_charger_installation_timestamp",
        "ev_charger_measurements",
        ["installation_id", "charger_id", "timestamp"],
    )
    op.execute(
        "SELECT create_hypertable('ev_charger_measurements', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # EPEX Spot Prices
    op.create_table(
        "epex_spot_prices",
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("region", sa.String(length=10), nullable=False),
        sa.Column("price_eur_per_kwh", sa.Float(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("timestamp", "region"),
    )
    op.create_index("idx_epex_region_timestamp", "epex_spot_prices", ["region", "timestamp"])
    op.execute(
        "SELECT create_hypertable('epex_spot_prices', 'timestamp', chunk_time_interval => INTERVAL '1 day');"
    )

    # Set retention policies (5-min data: 1 year, hourly: 5 years)
    # Note: These are examples - adjust based on actual requirements
    # Execute separately for asyncpg compatibility (cannot execute multiple statements in one call)
    op.execute("SELECT add_retention_policy('battery_measurements', INTERVAL '1 year')")
    op.execute("SELECT add_retention_policy('inverter_measurements', INTERVAL '1 year')")
    op.execute("SELECT add_retention_policy('meter_measurements', INTERVAL '1 year')")
    op.execute("SELECT add_retention_policy('generator_measurements', INTERVAL '1 year')")
    op.execute("SELECT add_retention_policy('ev_charger_measurements', INTERVAL '1 year')")
    op.execute("SELECT add_retention_policy('epex_spot_prices', INTERVAL '2 years')")


def downgrade() -> None:
    op.drop_index("idx_epex_region_timestamp", table_name="epex_spot_prices")
    op.drop_table("epex_spot_prices")
    op.drop_index("idx_ev_charger_installation_timestamp", table_name="ev_charger_measurements")
    op.drop_table("ev_charger_measurements")
    op.drop_index("idx_generator_installation_timestamp", table_name="generator_measurements")
    op.drop_table("generator_measurements")
    op.drop_index("idx_meter_installation_timestamp", table_name="meter_measurements")
    op.drop_table("meter_measurements")
    op.drop_index("idx_inverter_installation_timestamp", table_name="inverter_measurements")
    op.drop_table("inverter_measurements")
    op.drop_index("idx_battery_installation_timestamp", table_name="battery_measurements")
    op.drop_table("battery_measurements")

