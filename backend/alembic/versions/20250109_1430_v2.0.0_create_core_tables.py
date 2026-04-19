"""v2.0.0: Create core tables

Revision ID: 20250109_1430_v2.0.0
Revises: 
Create Date: 2025-01-09 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20250109_1430_v2.0.0"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Installations
    op.create_table(
        "installations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False),
        sa.Column("timezone", sa.String(length=50), nullable=False, server_default="Europe/Amsterdam"),
        sa.Column("has_pv", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("has_battery", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("has_generator", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_ev_chargers", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("inverter_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("charger_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_installations_location"), "installations", ["location"], unique=False)
    op.create_index(op.f("ix_installations_name"), "installations", ["name"], unique=True)

    # Batteries
    op.create_table(
        "batteries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("capacity_kwh", sa.Float(), nullable=False),
        sa.Column("evening_reserve_percentage", sa.Float(), nullable=False, server_default="30.0"),
        sa.Column("minimum_reserve_percentage", sa.Float(), nullable=False, server_default="20.0"),
        sa.Column("soc_percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("current_power_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="idle"),
        sa.Column("last_measurement_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint("soc_percentage >= 0 AND soc_percentage <= 100"),
        sa.CheckConstraint("evening_reserve_percentage >= minimum_reserve_percentage"),
    )
    op.create_index(op.f("ix_batteries_installation_id"), "batteries", ["installation_id"], unique=True)

    # Inverters
    op.create_table(
        "inverters",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("inverter_number", sa.Integer(), nullable=False),
        sa.Column("rated_power_kw", sa.Float(), nullable=False),
        sa.Column("current_power_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("curtailment_percentage", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("last_measurement_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("installation_id", "inverter_number"),
        sa.CheckConstraint("inverter_number >= 1 AND inverter_number <= 8"),
        sa.CheckConstraint("curtailment_percentage >= 0 AND curtailment_percentage <= 100"),
    )
    op.create_index(op.f("ix_inverters_installation_id"), "inverters", ["installation_id"], unique=False)

    # Generators
    op.create_table(
        "generators",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("fuel_cost_per_liter", sa.Float(), nullable=False, server_default="1.50"),
        sa.Column("rated_power_kw", sa.Float(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="off"),
        sa.Column("fuel_consumption_lph", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("charging_power_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("runtime_hours", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("last_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_stop_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_generators_installation_id"), "generators", ["installation_id"], unique=True)

    # EV Chargers
    op.create_table(
        "ev_chargers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("charger_number", sa.Integer(), nullable=False),
        sa.Column("tariff_per_kwh", sa.Float(), nullable=False),
        sa.Column("session_active", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("session_energy_kwh", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("session_source", sa.String(length=20), nullable=True),
        sa.Column("session_revenue_eur", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_revenue_eur", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("session_start_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("installation_id", "charger_number"),
        sa.CheckConstraint("charger_number >= 1 AND charger_number <= 4"),
    )
    op.create_index(op.f("ix_ev_chargers_installation_id"), "ev_chargers", ["installation_id"], unique=False)

    # Main Meters
    op.create_table(
        "main_meters",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("import_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("export_kw", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("import_kwh_total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("export_kwh_total", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l1_current_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l2_current_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("l3_current_a", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("last_measurement_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_main_meters_installation_id"), "main_meters", ["installation_id"], unique=True)

    # Users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="customer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=50), nullable=True),
        sa.Column("language_preference", sa.String(length=10), nullable=False, server_default="nl"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    # User Installations
    op.create_table(
        "user_installations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("access_level", sa.String(length=20), nullable=False, server_default="view"),
        sa.Column("granted_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "installation_id"),
    )
    op.create_index(op.f("ix_user_installations_installation_id"), "user_installations", ["installation_id"], unique=False)
    op.create_index(op.f("ix_user_installations_user_id"), "user_installations", ["user_id"], unique=False)

    # Installation Configs
    op.create_table(
        "installation_configs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("config_key", sa.String(length=100), nullable=False),
        sa.Column("config_value", sa.String(length=500), nullable=False),
        sa.Column("value_type", sa.String(length=20), nullable=False, server_default="string"),
        sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("installation_id", "config_key"),
    )
    op.create_index(op.f("ix_installation_configs_installation_id"), "installation_configs", ["installation_id"], unique=False)

    # Alert Rules
    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("installation_id", sa.Integer(), nullable=False),
        sa.Column("component_type", sa.String(length=20), nullable=False),
        sa.Column("condition", sa.String(length=100), nullable=False),
        sa.Column("threshold", sa.Float(), nullable=False),
        sa.Column("notification_method", sa.String(length=20), nullable=False, server_default="email"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("last_triggered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trigger_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["installation_id"], ["installations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alert_rules_installation_id"), "alert_rules", ["installation_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_alert_rules_installation_id"), table_name="alert_rules")
    op.drop_table("alert_rules")
    op.drop_index(op.f("ix_installation_configs_installation_id"), table_name="installation_configs")
    op.drop_table("installation_configs")
    op.drop_index(op.f("ix_user_installations_user_id"), table_name="user_installations")
    op.drop_index(op.f("ix_user_installations_installation_id"), table_name="user_installations")
    op.drop_table("user_installations")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.drop_index(op.f("ix_main_meters_installation_id"), table_name="main_meters")
    op.drop_table("main_meters")
    op.drop_index(op.f("ix_ev_chargers_installation_id"), table_name="ev_chargers")
    op.drop_table("ev_chargers")
    op.drop_index(op.f("ix_generators_installation_id"), table_name="generators")
    op.drop_table("generators")
    op.drop_index(op.f("ix_inverters_installation_id"), table_name="inverters")
    op.drop_table("inverters")
    op.drop_index(op.f("ix_batteries_installation_id"), table_name="batteries")
    op.drop_table("batteries")
    op.drop_index(op.f("ix_installations_name"), table_name="installations")
    op.drop_index(op.f("ix_installations_location"), table_name="installations")
    op.drop_table("installations")

