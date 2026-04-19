"""v2.0.0: Create continuous aggregates for hourly/daily rollups

Revision ID: 20250109_1515_v2.0.0
Revises: 20250109_1500_v2.0.0
Create Date: 2025-01-09 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20250109_1515_v2.0.0"
down_revision: Union[str, None] = "20250109_1500_v2.0.0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Battery hourly aggregates
    # Use WITH NO DATA to avoid transaction issues - TimescaleDB will populate via policy
    op.execute("""
        CREATE MATERIALIZED VIEW battery_measurements_hourly
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', timestamp) AS bucket,
            installation_id,
            AVG(soc_percentage) AS avg_soc_percentage,
            AVG(power_kw) AS avg_power_kw,
            MIN(soc_percentage) AS min_soc_percentage,
            MAX(soc_percentage) AS max_soc_percentage,
            MIN(power_kw) AS min_power_kw,
            MAX(power_kw) AS max_power_kw
        FROM battery_measurements
        GROUP BY bucket, installation_id
        WITH NO DATA;
    """)
    
    op.execute("""
        SELECT add_continuous_aggregate_policy('battery_measurements_hourly',
            start_offset => INTERVAL '3 hours',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour');
    """)

    # Inverter hourly aggregates
    # Use WITH NO DATA to avoid transaction issues - TimescaleDB will populate via policy
    op.execute("""
        CREATE MATERIALIZED VIEW inverter_measurements_hourly
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', timestamp) AS bucket,
            installation_id,
            inverter_id,
            AVG(power_kw) AS avg_power_kw,
            SUM(energy_kwh_daily) AS total_energy_kwh,
            AVG(curtailment_percentage) AS avg_curtailment_percentage
        FROM inverter_measurements
        GROUP BY bucket, installation_id, inverter_id
        WITH NO DATA;
    """)
    
    op.execute("""
        SELECT add_continuous_aggregate_policy('inverter_measurements_hourly',
            start_offset => INTERVAL '3 hours',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour');
    """)

    # Meter hourly aggregates
    # Use WITH NO DATA to avoid transaction issues - TimescaleDB will populate via policy
    op.execute("""
        CREATE MATERIALIZED VIEW meter_measurements_hourly
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', timestamp) AS bucket,
            installation_id,
            AVG(import_kw) AS avg_import_kw,
            AVG(export_kw) AS avg_export_kw,
            SUM(import_kwh) AS total_import_kwh,
            SUM(export_kwh) AS total_export_kwh
        FROM meter_measurements
        GROUP BY bucket, installation_id
        WITH NO DATA;
    """)
    
    op.execute("""
        SELECT add_continuous_aggregate_policy('meter_measurements_hourly',
            start_offset => INTERVAL '3 hours',
            end_offset => INTERVAL '1 hour',
            schedule_interval => INTERVAL '1 hour');
    """)


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS meter_measurements_hourly CASCADE;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS inverter_measurements_hourly CASCADE;")
    op.execute("DROP MATERIALIZED VIEW IF EXISTS battery_measurements_hourly CASCADE;")

