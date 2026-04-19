# Database Schema Documentation

## Overview

The database uses TimescaleDB (PostgreSQL with time-series extensions) for efficient storage and querying of time-series measurement data.

## Core Tables

### installations
Represents customer installation sites.

**Fields:**
- `id` (PK)
- `name` (unique)
- `location`
- `timezone`
- `has_pv`, `has_battery`, `has_generator`, `has_ev_chargers` (boolean flags)
- `inverter_count` (1-8)
- `charger_count` (0-4)
- `created_at`, `updated_at`, `deleted_at`

### batteries
Battery storage systems.

**Fields:**
- `id` (PK)
- `installation_id` (FK, unique)
- `capacity_kwh`
- `evening_reserve_percentage` (default: 30%)
- `minimum_reserve_percentage` (default: 20%)
- `soc_percentage` (0-100)
- `current_power_kw`
- `status` (charging/discharging/idle/blocked)
- `last_measurement_at`

### inverters
Solar PV inverters (1-8 per installation).

**Fields:**
- `id` (PK)
- `installation_id` (FK)
- `inverter_number` (1-8, unique with installation_id)
- `rated_power_kw`
- `current_power_kw`
- `curtailment_percentage` (0-100)
- `status` (active/dimmed/disabled/error)
- `last_measurement_at`

### generators
Backup generators (one per installation).

**Fields:**
- `id` (PK)
- `installation_id` (FK, unique)
- `fuel_cost_per_liter`
- `rated_power_kw`
- `status` (on/off/starting/error)
- `fuel_consumption_lph`
- `charging_power_kw`
- `runtime_hours`
- `last_start_at`, `last_stop_at`

### ev_chargers
EV charging points (1-4 per installation).

**Fields:**
- `id` (PK)
- `installation_id` (FK)
- `charger_number` (1-4, unique with installation_id)
- `tariff_per_kwh`
- `session_active`
- `session_energy_kwh`
- `session_source` (battery/grid)
- `session_revenue_eur`
- `total_revenue_eur`
- `session_start_at`

### main_meters
Grid import/export meters.

**Fields:**
- `id` (PK)
- `installation_id` (FK, unique)
- `import_kw`, `export_kw`
- `import_kwh_total`, `export_kwh_total`
- `l1_current_a`, `l2_current_a`, `l3_current_a`
- `last_measurement_at`

### users
User accounts for authentication.

**Fields:**
- `id` (PK)
- `email` (unique)
- `password_hash`
- `role` (admin/customer)
- `is_active`
- `full_name`, `phone`
- `language_preference` (nl/en)
- `last_login_at`

### user_installations
User-installation access mapping.

**Fields:**
- `id` (PK)
- `user_id` (FK)
- `installation_id` (FK)
- `access_level` (view/configure/admin)
- `granted_at`, `expires_at`
- Unique constraint on (user_id, installation_id)

## Time-Series Tables (Hypertables)

All measurement tables are TimescaleDB hypertables with:
- Partitioning by day (1-day chunks)
- Retention policies (5-min data: 1 year)
- Compound indexes on (installation_id, timestamp)

### battery_measurements
- `timestamp` (PK)
- `installation_id` (PK)
- `soc_percentage`, `power_kw`, `voltage`, `temperature`

### inverter_measurements
- `timestamp` (PK)
- `installation_id` (PK)
- `inverter_id` (PK)
- `power_kw`, `energy_kwh_daily`, `curtailment_percentage`

### meter_measurements
- `timestamp` (PK)
- `installation_id` (PK)
- `import_kw`, `export_kw`, `import_kwh`, `export_kwh`
- `l1_a`, `l2_a`, `l3_a`

### generator_measurements
- `timestamp` (PK)
- `installation_id` (PK)
- `status`, `fuel_consumption_lph`, `charging_power_kw`

### ev_charger_measurements
- `timestamp` (PK)
- `installation_id` (PK)
- `charger_id` (PK)
- `power_kw`, `energy_kwh`, `source`, `revenue_eur`

### epex_spot_prices
- `timestamp` (PK)
- `region` (PK)
- `price_eur_per_kwh`

## Continuous Aggregates

Materialized views for hourly rollups:
- `battery_measurements_hourly`
- `inverter_measurements_hourly`
- `meter_measurements_hourly`

These are automatically refreshed every hour.

## Relationships

- Installation → Battery (1:1)
- Installation → Inverters (1:many, 1-8)
- Installation → Generator (1:1, optional)
- Installation → EV Chargers (1:many, 0-4)
- Installation → Main Meter (1:1)
- Installation → Users (many:many via user_installations)
- Installation → Configs (1:many)
- Installation → Alert Rules (1:many)

