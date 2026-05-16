"use client";

import React, { useState, useEffect } from "react";
import {
  Installation,
  InstallationCreate,
  InstallationComponentData,
  InstallationUpdate,
  installationsApi,
  ApiClientError,
  locationApi,
  Country,
} from "@/lib/api/client";
import { useAuth } from "@/contexts/AuthContext";

interface InstallationRegistrationProps {
  userId: number;
  installation?: Installation | null;
  onClose: () => void;
  onSuccess: (installation: Installation) => void;
}

const isEditMode = (
  installation: Installation | null | undefined,
): installation is Installation => Boolean(installation?.id);

export function InstallationRegistration({
  userId,
  installation,
  onClose,
  onSuccess,
}: InstallationRegistrationProps) {
  const { token } = useAuth();
  const editMode = isEditMode(installation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [componentData, setComponentData] =
    useState<InstallationComponentData | null>(null);
  const [formData, setFormData] = useState<InstallationCreate>({
    name: "",
    country: "",
    state: null,
    city: "",
    user_id: userId,
    timezone: "Europe/Amsterdam",
    has_pv: true,
    has_battery: true,
    has_generator: false,
    has_ev_chargers: false,
    inverter_count: 1,
    charger_count: 0,
  });

  const [configs, setConfigs] = useState<Record<string, string>>({
    ACTIVE: "true",
    MAX_SOLAR_POWER: "",
    BATTERY_CAPACITY: "",
    BATTERY_MAX_CHARGE: "",
    BATTERY_BUFFER: "",
    NETCONNECTION: "",
    CHARGE_POWER: "",
    CHARGINGPRICE: "",
    ELECTRICITY_PRICE: "",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const getTimezoneForCountry = (countryCode: string): string => {
    const timezoneMap: Record<string, string> = {
      NL: "Europe/Amsterdam",
      BE: "Europe/Brussels",
      DE: "Europe/Berlin",
      FR: "Europe/Paris",
      GB: "Europe/London",
      ES: "Europe/Madrid",
      IT: "Europe/Rome",
      PL: "Europe/Warsaw",
      PT: "Europe/Lisbon",
      US: "America/New_York",
      CA: "America/Toronto",
      AU: "Australia/Sydney",
    };
    return timezoneMap[countryCode.toUpperCase()] || "UTC";
  };

  useEffect(() => {
    if (!editMode || !installation) return;
    setFormData({
      name: installation.name,
      country: installation.country,
      state: installation.state ?? null,
      city: installation.city,
      user_id: userId,
      timezone: installation.timezone,
      has_pv: installation.has_pv,
      has_battery: installation.has_battery,
      has_generator: installation.has_generator,
      has_ev_chargers: installation.has_ev_chargers,
      inverter_count: installation.inverter_count,
      charger_count: installation.charger_count,
    });
  }, [editMode, installation, userId]);

  useEffect(() => {
    if (!editMode || !installation?.id || !token) return;
    installationsApi
      .getInstallationComponentData(installation.id, token)
      .then(setComponentData)
      .catch(console.error);
    installationsApi
      .getConfigs(installation.id, token)
      .then((data) => setConfigs((prev) => ({ ...prev, ...data })))
      .catch(console.error);
  }, [editMode, installation?.id, token]);

  useEffect(() => {
    if (!token) return;
    setLoadingCountries(true);
    locationApi
      .getCountries(token)
      .then((r) => setCountries(r.countries))
      .catch(console.error)
      .finally(() => setLoadingCountries(false));
  }, [token]);

  useEffect(() => {
    if (editMode || !formData.country) return;
    setFormData((prev) => ({
      ...prev,
      timezone: getTimezoneForCountry(formData.country),
    }));
  }, [editMode, formData.country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (editMode && installation) {
      const newInvCount = formData.inverter_count ?? 1;
      const newChCount = formData.charger_count ?? 0;

      if (newInvCount < installation.inverter_count && componentData) {
        const removed = componentData.inverters
          .filter(
            (inv) => inv.inverter_number > newInvCount && inv.has_measurements,
          )
          .map((inv) => inv.inverter_number);
        if (
          removed.length > 0 &&
          !window.confirm(
            `Remove inverters ${removed.join(", ")} and all data? Cannot be undone.`,
          )
        )
          return;
      }

      if (
        formData.has_ev_chargers &&
        newChCount < installation.charger_count &&
        componentData
      ) {
        const removed = componentData.chargers
          .filter((ch) => ch.charger_number > newChCount && ch.has_measurements)
          .map((ch) => ch.charger_number);
        if (
          removed.length > 0 &&
          !window.confirm(
            `Remove chargers ${removed.join(", ")} and all data? Cannot be undone.`,
          )
        )
          return;
      }

      setLoading(true);
      setError(null);
      try {
        const payload: InstallationUpdate = {
          name: formData.name,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          timezone: formData.timezone,
          has_pv: formData.has_pv,
          has_battery: formData.has_battery,
          has_generator: formData.has_generator,
          has_ev_chargers: formData.has_ev_chargers,
          inverter_count: formData.inverter_count,
          charger_count: formData.charger_count,
        };
        const updated = await installationsApi.updateInstallation(
          installation.id,
          payload,
          token,
        );
        await installationsApi.updateConfigs(installation.id, configs, token);
        onSuccess(updated);
        onClose();
      } catch (err) {
        setError(
          err instanceof ApiClientError
            ? err.detail
            : "Failed to update installation",
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await installationsApi.createInstallation(
        formData,
        token,
      );
      onSuccess(created);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.detail
          : "Failed to create installation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-text">
          {editMode ? "Edit Installation" : "Create Installation"}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/20 border border-critical/50 text-critical text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Section 1: General */}
            <div className="text-xs uppercase font-semibold text-text-muted border-b border-border pb-1">
              General
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  Country *
                </label>
                <select
                  required
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                  disabled={loadingCountries}
                >
                  <option value="">
                    {loadingCountries ? "Loading..." : "Select"}
                  </option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value || null })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {[
                { key: "has_pv", label: "PV" },
                { key: "has_battery", label: "Battery" },
                { key: "has_generator", label: "Generator" },
                { key: "has_ev_chargers", label: "EV Chargers" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={
                      formData[key as keyof InstallationCreate] as boolean
                    }
                    onChange={(e) =>
                      setFormData({ ...formData, [key]: e.target.checked })
                    }
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">{label}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  Inverters (1-99)
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={formData.inverter_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inverter_count: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  Chargers (0-99)
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={formData.charger_count}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      charger_count: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>
            </div>

            {/* Section 2: Configuration (edit mode only) */}
            {editMode && (
              <>
                <div className="text-xs uppercase font-semibold text-text-muted border-b border-border pb-1 mt-2">
                  Configuration
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={configs.ACTIVE === "true"}
                    onChange={(e) =>
                      setConfigs({
                        ...configs,
                        ACTIVE: e.target.checked ? "true" : "false",
                      })
                    }
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">
                    Active (RPi uploads data)
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "MAX_SOLAR_POWER", label: "Max Solar Power (kW)" },
                    {
                      key: "BATTERY_CAPACITY",
                      label: "Battery Capacity (kWh)",
                    },
                    {
                      key: "BATTERY_MAX_CHARGE",
                      label: "Battery Max Charge (kWh/h)",
                    },
                    { key: "BATTERY_BUFFER", label: "Battery Buffer (%)" },
                    { key: "NETCONNECTION", label: "Net Connection (kW)" },
                    { key: "CHARGE_POWER", label: "Charge Power (kWh/day)" },
                    { key: "CHARGINGPRICE", label: "Charging Price (€/kWh)" },
                    {
                      key: "ELECTRICITY_PRICE",
                      label: "Electricity Price (€/kWh)",
                    },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium mb-1 text-text-muted">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={configs[key] || ""}
                        onChange={(e) =>
                          setConfigs({ ...configs, [key]: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1 text-sm"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={
                loading || !formData.name || !formData.country || !formData.city
              }
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90 disabled:opacity-50"
            >
              {loading ? "Saving..." : editMode ? "Save" : "Create"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors bg-border text-text hover:bg-border/80"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
