"use client";

/**
 * Device-Specific Dashboard Page
 * Shows dashboard for a specific edge device's installation
 */

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { BatteryEnhanced } from "@/components/dashboard/BatteryEnhanced";
import { InverterCard } from "@/components/dashboard/InverterCard";
import { MainMeter } from "@/components/dashboard/MainMeter";
import { PhaseCurrents } from "@/components/dashboard/PhaseCurrents";
import { Generator } from "@/components/dashboard/Generator";
import { EVChargersGrid } from "@/components/dashboard/EVChargersGrid";
import { RevenueCharts } from "@/components/dashboard/RevenueCharts";
import { FinancialKPIs } from "@/components/dashboard/FinancialKPIs";
import { OperatorControls } from "@/components/dashboard/OperatorControls";
import { DateTimeWidget } from "@/components/dashboard/DateTimeWidget";
import { WeatherWidget } from "@/components/dashboard/WeatherWidget";
import { EnergyFlowDiagram } from "@/components/dashboard/EnergyFlowDiagram";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { Logo } from "@/components/common/Logo";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useWebSocket } from "@/hooks/useWebSocket";
import {
  installationsApi,
  edgeDevicesApi,
  measurementsApi,
  ApiClientError,
} from "@/lib/api/client";
import { WebSocketMessage } from "@/lib/api/websocket";

function DashboardContent() {
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const deviceId = parseInt(params.device_id as string);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<any>(null);
  const [installationId, setInstallationId] = useState<number | null>(null);
  const [installation, setInstallation] = useState<any>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [activeInverterTab, setActiveInverterTab] = useState(0);

  // Battery state - initialized as null until data is loaded
  const [batteryData, setBatteryData] = useState<{
    soc: number;
    capacity: number;
    power: number;
    status: "charging" | "discharging" | "idle";
    eveningReserve: number;
    minimumReserve: number;
    availableCapacity?: number | null;
    batteryCapacity?: number | null;
    batteryBuffer?: number | null;
  } | null>(null);

  // Inverters state - initialized as empty array until data is loaded
  const [inverters, setInverters] = useState<
    Array<{
      id: number;
      number: number;
      power: number;
      ratedPower: number;
      curtailment: number;
      status: "active" | "dimmed";
      curtailmentReason?: string;
    }>
  >([]);

  // Main Meter state - initialized as null until data is loaded
  const [meterData, setMeterData] = useState<{
    importKw: number;
    exportKw: number;
    importKwh: number;
    exportKwh: number;
    l1Current: number;
    l2Current: number;
    l3Current: number;
    highImportWarning: boolean;
    zeroExportActive: boolean;
  } | null>(null);

  // Generator state - initialized as null until data is loaded
  const [generator, setGenerator] = useState<{
    status: "off" | "on" | "starting" | "error";
    fuelConsumption: number;
    chargingPower: number;
    fuelCost: number;
    autoStartReason?: string;
  } | null>(null);

  // EV Chargers state - initialized as empty array until data is loaded
  const [evChargers, setEvChargers] = useState<
    Array<{
      chargerNumber: number;
      isActive: boolean;
      batteryEnergy: number;
      gridEnergy: number;
      tariff: number;
      revenue: number;
      currentPower: number;
    }>
  >([]);

  // Financial KPIs - initialized with default values (can be calculated from data)
  const [financialKPIs, setFinancialKPIs] = useState({
    savings: {
      day: 0,
      week: 0,
      month: 0,
    },
    evChargingMargins: 0,
    arbitrageScore: 0,
    autonomyPercentage: 0,
    timeToPayback: "N/A",
  });

  // Operator Controls - initialized with defaults (can be loaded from config)
  const [operatorSettings, setOperatorSettings] = useState({
    eveningReserve: 30,
    generatorPriceThreshold: 0.25,
    maxChargingCapacity: 5.0,
    contractElectricityPrice: 0.22,
  });

  // Revenue data - initialized as empty (can be loaded from history API)
  const [revenueData, setRevenueData] = useState({
    selfConsumption: [] as Array<{ time: string; savings: number }>,
    feedIn: [] as Array<{ time: string; revenue: number; price: number }>,
    arbitrage: [] as Array<{
      time: string;
      chargePrice: number;
      dischargePrice: number;
      profit: number;
    }>,
    evCharging: [] as Array<{
      charger: number;
      revenue: number;
      margin: number;
    }>,
    totalPayback: [] as Array<{ date: string; cumulative: number }>,
  });

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log("[Dashboard] 🔄 Processing WebSocket message:", {
      type: message.type,
      data: message.data,
      timestamp: message.timestamp,
    });

    try {
      if (message.type === "battery_update") {
        setBatteryData((prev) => {
          if (!prev) {
            // Initialize if null
            return {
              soc: message.data.soc_percentage ?? 0,
              capacity: 10.0, // Default, should come from config
              power: message.data.power_kw ?? 0,
              status:
                (message.data.power_kw ?? 0) > 0
                  ? "discharging"
                  : (message.data.power_kw ?? 0) < 0
                    ? "charging"
                    : "idle",
              eveningReserve: 30,
              minimumReserve: 20,
            };
          }
          return {
            ...prev,
            soc: message.data.soc_percentage ?? prev.soc,
            power: message.data.power_kw ?? prev.power,
            status:
              (message.data.power_kw ?? 0) > 0
                ? "discharging"
                : (message.data.power_kw ?? 0) < 0
                  ? "charging"
                  : "idle",
          };
        });
      } else if (message.type === "inverter_update") {
        setInverters((prev) => {
          const inverterId = message.data.inverter_id;
          if (!inverterId) {
            console.warn("[Dashboard] inverter_update missing inverter_id");
            return prev;
          }
          const existingIndex = prev.findIndex((inv) => inv.id === inverterId);
          if (existingIndex >= 0) {
            // Update existing inverter
            return prev.map((inv) =>
              inv.id === inverterId
                ? {
                    ...inv,
                    power: message.data.power_kw ?? inv.power,
                    curtailment:
                      message.data.curtailment_percentage ?? inv.curtailment,
                    status:
                      (message.data.curtailment_percentage ?? 0) > 0
                        ? "dimmed"
                        : "active",
                    curtailmentReason:
                      (message.data.curtailment_percentage ?? 0) > 0
                        ? "Curtailment active"
                        : undefined,
                  }
                : inv,
            );
          } else {
            // Add new inverter if not found (shouldn't happen normally)
            console.warn(
              `[Dashboard] inverter_update for unknown inverter_id: ${inverterId}`,
            );
            return prev;
          }
        });
      } else if (message.type === "meter_update") {
        console.log("[Dashboard] ⚡ Updating meter data from websocket:", {
          received: message.data,
          updates: {
            importKw: message.data.import_kw,
            exportKw: message.data.export_kw,
            importKwh: message.data.import_kwh,
            exportKwh: message.data.export_kwh,
            l1Current: message.data.l1_a,
            l2Current: message.data.l2_a,
            l3Current: message.data.l3_a,
          },
        });
        setMeterData((prev) => {
          if (!prev) {
            // Initialize if null
            return {
              importKw: message.data.import_kw ?? 0,
              exportKw: message.data.export_kw ?? 0,
              importKwh: message.data.import_kwh ?? 0,
              exportKwh: message.data.export_kwh ?? 0,
              l1Current: message.data.l1_a ?? 0,
              l2Current: message.data.l2_a ?? 0,
              l3Current: message.data.l3_a ?? 0,
              highImportWarning: (message.data.import_kw ?? 0) > 10.0,
              zeroExportActive: false,
            };
          }
          const updated = {
            ...prev,
            importKw: message.data.import_kw ?? prev.importKw,
            exportKw: message.data.export_kw ?? prev.exportKw,
            importKwh: message.data.import_kwh ?? prev.importKwh,
            exportKwh: message.data.export_kwh ?? prev.exportKwh,
            l1Current: message.data.l1_a ?? prev.l1Current,
            l2Current: message.data.l2_a ?? prev.l2Current,
            l3Current: message.data.l3_a ?? prev.l3Current,
            highImportWarning: (message.data.import_kw ?? 0) > 10.0,
          };
          console.log("[Dashboard] ✅ Meter data updated:", {
            previous: prev,
            updated: updated,
          });
          return updated;
        });
      } else if (message.type === "generator_update") {
        setGenerator((prev) => {
          if (!prev) {
            return {
              status:
                (message.data.status as "off" | "on" | "starting" | "error") ??
                "off",
              fuelConsumption: message.data.fuel_consumption_lph ?? 0,
              chargingPower: message.data.charging_power_kw ?? 0,
              fuelCost: 1.5,
              autoStartReason: message.data.auto_start_reason,
            };
          }
          return {
            ...prev,
            ...(message.data.status && {
              status: message.data.status as
                | "off"
                | "on"
                | "starting"
                | "error",
            }),
            ...(message.data.fuel_consumption_lph !== undefined && {
              fuelConsumption: message.data.fuel_consumption_lph,
            }),
            ...(message.data.charging_power_kw !== undefined && {
              chargingPower: message.data.charging_power_kw,
            }),
            ...(message.data.auto_start_reason !== undefined && {
              autoStartReason: message.data.auto_start_reason,
            }),
          };
        });
      } else if (message.type === "ev_charger_update") {
        setEvChargers((prev) => {
          const chargerNumber = message.data.charger_number;
          if (!chargerNumber) {
            console.warn(
              "[Dashboard] ev_charger_update missing charger_number",
            );
            return prev;
          }
          const existingIndex = prev.findIndex(
            (c) => c.chargerNumber === chargerNumber,
          );
          if (existingIndex >= 0) {
            // Update existing charger
            return prev.map((charger) =>
              charger.chargerNumber === chargerNumber
                ? {
                    ...charger,
                    isActive: (message.data.power_kw ?? 0) > 0,
                    currentPower: message.data.power_kw ?? charger.currentPower,
                    batteryEnergy:
                      message.data.source === "battery"
                        ? (message.data.energy_kwh ?? charger.batteryEnergy)
                        : charger.batteryEnergy,
                    gridEnergy:
                      message.data.source === "grid"
                        ? (message.data.energy_kwh ?? charger.gridEnergy)
                        : charger.gridEnergy,
                    revenue: message.data.revenue_eur ?? charger.revenue,
                  }
                : charger,
            );
          } else {
            // Add new charger if not found
            return [
              ...prev,
              {
                chargerNumber: chargerNumber,
                isActive: (message.data.power_kw ?? 0) > 0,
                currentPower: message.data.power_kw ?? 0,
                batteryEnergy:
                  message.data.source === "battery"
                    ? (message.data.energy_kwh ?? 0)
                    : 0,
                gridEnergy:
                  message.data.source === "grid"
                    ? (message.data.energy_kwh ?? 0)
                    : 0,
                tariff: 0.35,
                revenue: message.data.revenue_eur ?? 0,
              },
            ];
          }
        });
      }
    } catch (error) {
      console.error(
        "[Dashboard] Error processing WebSocket message:",
        error,
        message,
      );
    }
  }, []);

  // Load device and installation data
  useEffect(() => {
    const loadData = async () => {
      if (!token || !deviceId) return;

      try {
        setLoading(true);
        setError(null);

        // Get all installations to find the one with this device
        const installationsResponse =
          await installationsApi.getInstallations(token);
        const installations = installationsResponse.installations || [];

        // Find device in installations
        let foundDevice = null;
        let foundInstallationId = null;

        for (const installation of installations) {
          try {
            const devicesResponse = await edgeDevicesApi.getDevices(
              installation.id,
              token,
            );
            const device = devicesResponse.devices.find(
              (d) => d.id === deviceId,
            );
            if (device) {
              foundDevice = device;
              foundInstallationId = installation.id;
              break;
            }
          } catch (err) {
            console.error(
              `Failed to load devices for installation ${installation.id}:`,
              err,
            );
          }
        }

        if (!foundDevice) {
          setError(t("devices.deviceNotFound") || "Device not found");
          setLoading(false);
          return;
        }

        setDevice(foundDevice);
        setInstallationId(foundInstallationId);

        // Find and set installation data
        const foundInstallation = installations.find(
          (inst) => inst.id === foundInstallationId,
        );
        if (foundInstallation) {
          setInstallation(foundInstallation);
        }

        // Load installation live data
        if (foundInstallationId) {
          try {
            const data = await installationsApi.getLiveData(
              foundInstallationId,
              token,
            );

            // Update meter data
            if (data.latest_measurements?.meter) {
              const meter = data.latest_measurements.meter;
              setMeterData({
                importKw: meter.import_kw,
                exportKw: meter.export_kw,
                importKwh: meter.import_kwh,
                exportKwh: meter.export_kwh,
                l1Current: meter.l1_a,
                l2Current: meter.l2_a,
                l3Current: meter.l3_a,
                highImportWarning: meter.import_kw > 10.0, // Threshold can be configured
                zeroExportActive: false, // Can be determined from config
              });
            }

            // Update battery data
            if (data.latest_measurements?.battery) {
              const battery = data.latest_measurements.battery;
              const batteryConfig = data.battery;
              setBatteryData({
                soc: battery.soc_percentage,
                capacity: batteryConfig?.capacity_kwh || 10.0,
                power: battery.power_kw,
                status:
                  battery.power_kw > 0
                    ? "discharging"
                    : battery.power_kw < 0
                      ? "charging"
                      : "idle",
                eveningReserve: batteryConfig?.evening_reserve_percentage || 30,
                minimumReserve: batteryConfig?.minimum_reserve_percentage || 20,
                availableCapacity: battery.available_capacity ?? null,
                batteryCapacity: battery.battery_capacity ?? null,
                batteryBuffer: battery.battery_buffer ?? null,
              });
            }

            // Update inverters
            if (data.latest_measurements?.inverters && data.inverters) {
              const inverterMeasurements = data.latest_measurements.inverters;
              const inverterConfigs = data.inverters;

              const updatedInverters = inverterConfigs.map((invConfig: any) => {
                const measurement = inverterMeasurements.find(
                  (m: any) => m.inverter_id === invConfig.id,
                );
                if (measurement) {
                  return {
                    id: invConfig.id,
                    number: invConfig.inverter_number,
                    power: measurement.power_kw,
                    ratedPower: invConfig.rated_power_kw,
                    curtailment: measurement.curtailment_percentage,
                    status:
                      measurement.curtailment_percentage > 0
                        ? "dimmed"
                        : "active",
                    curtailmentReason:
                      measurement.curtailment_percentage > 0
                        ? "Curtailment active"
                        : undefined,
                  };
                }
                return {
                  id: invConfig.id,
                  number: invConfig.inverter_number,
                  power: 0,
                  ratedPower: invConfig.rated_power_kw,
                  curtailment: 0,
                  status: "active" as const,
                  curtailmentReason: undefined,
                };
              });
              setInverters(updatedInverters);
            }

            // Update generator
            if (data.latest_measurements?.generator && data.generator) {
              const gen = data.latest_measurements.generator;
              setGenerator({
                status: gen.status as "off" | "on" | "starting" | "error",
                fuelConsumption: gen.fuel_consumption_lph,
                chargingPower: gen.charging_power_kw,
                fuelCost: 1.5, // Can be from config
                autoStartReason: undefined,
              });
            }

            // Update EV chargers
            if (data.ev_chargers) {
              const chargerMeasurements =
                data.latest_measurements?.ev_chargers || [];
              const chargerConfigs = data.ev_chargers;
              const batterySoC =
                data.latest_measurements?.battery?.soc_percentage || 50;

              const updatedChargers = chargerConfigs.map(
                (chargerConfig: any) => {
                  const measurement = chargerMeasurements.find(
                    (m: any) => m.charger_id === chargerConfig.id,
                  );

                  // Calculate energy split based on session or estimates
                  // If we have session data, use it; otherwise estimate from total revenue
                  const sessionEnergy = chargerConfig.session_energy_kwh || 0;
                  const totalRevenue = chargerConfig.total_revenue_eur || 0;
                  const tariff = chargerConfig.tariff_per_kwh || 0.35;

                  // Estimate total energy from revenue if no session
                  const totalEnergy =
                    sessionEnergy > 0 ? sessionEnergy : totalRevenue / tariff;

                  // Split energy: if battery SOC > 50%, assume 60% from battery, else 30%
                  const batteryRatio = batterySoC > 50 ? 0.6 : 0.3;
                  const batteryEnergy = totalEnergy * batteryRatio;
                  const gridEnergy = totalEnergy * (1 - batteryRatio);

                  if (measurement) {
                    return {
                      chargerNumber: chargerConfig.charger_number,
                      isActive:
                        measurement.power_kw > 0 ||
                        chargerConfig.session_active,
                      batteryEnergy:
                        batteryEnergy > 0
                          ? batteryEnergy
                          : measurement.source === "battery"
                            ? measurement.energy_kwh
                            : 0,
                      gridEnergy:
                        gridEnergy > 0
                          ? gridEnergy
                          : measurement.source === "grid"
                            ? measurement.energy_kwh
                            : 0,
                      tariff: tariff,
                      revenue:
                        totalRevenue > 0
                          ? totalRevenue
                          : measurement.revenue_eur,
                      currentPower: measurement.power_kw,
                    };
                  }
                  return {
                    chargerNumber: chargerConfig.charger_number,
                    isActive: chargerConfig.session_active || false,
                    batteryEnergy: batteryEnergy,
                    gridEnergy: gridEnergy,
                    tariff: tariff,
                    revenue: totalRevenue,
                    currentPower: 0,
                  };
                },
              );
              setEvChargers(updatedChargers);
            }

            // Calculate Financial KPIs from live data
            const meterLatest = data.latest_measurements?.meter;
            const batteryLatest = data.latest_measurements?.battery;
            const invertersLatest = data.latest_measurements?.inverters || [];
            const evChargersLatest =
              data.latest_measurements?.ev_chargers || [];

            // Calculate total solar power
            const totalSolarPower = invertersLatest.reduce(
              (sum: number, inv: any) => sum + (inv.power_kw || 0),
              0,
            );

            // Calculate self-consumption (solar used directly, not exported)
            const selfConsumption = Math.max(
              0,
              totalSolarPower - (meterLatest?.export_kw || 0),
            );

            // Calculate savings (self-consumption × grid price)
            const gridPrice = 0.35; // €/kWh - could be from EPEX API
            const dailySavings = selfConsumption * gridPrice * 0.5; // Rough estimate

            // Calculate autonomy percentage (how much of consumption comes from solar/battery)
            const totalConsumption =
              selfConsumption + (meterLatest?.import_kw || 0);
            const autonomy =
              totalConsumption > 0
                ? (selfConsumption / totalConsumption) * 100
                : 0;

            // Calculate arbitrage score (based on battery activity)
            const batteryPower = batteryLatest?.power_kw || 0;
            const arbitrageScore =
              Math.abs(batteryPower) > 0.5
                ? Math.min(85, Math.abs(batteryPower) * 20)
                : 0;

            // Calculate EV charging margins
            const evRevenue = evChargersLatest.reduce(
              (sum: number, ev: any) => sum + (ev.revenue_eur || 0),
              0,
            );

            setFinancialKPIs({
              savings: {
                day: dailySavings,
                week: dailySavings * 7,
                month: dailySavings * 30,
              },
              evChargingMargins: evRevenue,
              arbitrageScore: arbitrageScore,
              autonomyPercentage: autonomy,
              timeToPayback: autonomy > 50 ? "4.2 years" : "5+ years",
            });

            // Generate revenue chart data from recent trends
            const now = new Date();
            const hours = Array.from({ length: 24 }, (_, i) => {
              const h = (now.getHours() - 23 + i + 24) % 24;
              return `${h.toString().padStart(2, "0")}:00`;
            });

            // Self-consumption data (simulated from current values)
            const selfConsumptionData = hours.map((time, i) => ({
              time,
              savings: Math.max(
                0,
                dailySavings *
                  (0.5 + Math.sin((i / 24) * Math.PI) * 0.5) *
                  (Math.random() * 0.3 + 0.85),
              ),
            }));

            // Feed-in data
            const feedInData = hours.map((time, i) => ({
              time,
              revenue: Math.max(
                0,
                (meterLatest?.export_kw || 0) *
                  0.08 *
                  (0.3 + Math.sin((i / 24) * Math.PI) * 0.7),
              ),
              price: 0.08 + Math.random() * 0.04,
            }));

            // Arbitrage data
            const arbitrageData = hours.map((time, i) => ({
              time,
              chargePrice: 0.15 + Math.sin((i / 12) * Math.PI) * 0.1,
              dischargePrice:
                0.25 + Math.sin((i / 12) * Math.PI + Math.PI) * 0.1,
              profit: Math.max(0, (0.25 - 0.15) * Math.abs(batteryPower) * 0.1),
            }));

            // EV charging data
            const evChargingDataCalc = evChargersLatest.map(
              (ev: any, i: number) => ({
                charger: ev.charger_id || i + 1,
                revenue: ev.revenue_eur || 0,
                margin: (ev.revenue_eur || 0) * 0.3,
              }),
            );

            // Total payback data (cumulative)
            const daysBack = 30;
            const totalPaybackData = Array.from(
              { length: daysBack },
              (_, i) => {
                const date = new Date(now);
                date.setDate(date.getDate() - (daysBack - 1 - i));
                return {
                  date: date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  }),
                  cumulative:
                    dailySavings * (i + 1) + evRevenue * (i + 1) * 0.5,
                };
              },
            );

            setRevenueData({
              selfConsumption: selfConsumptionData,
              feedIn: feedInData,
              arbitrage: arbitrageData,
              evCharging:
                evChargingDataCalc.length > 0
                  ? evChargingDataCalc
                  : [{ charger: 1, revenue: 0, margin: 0 }],
              totalPayback: totalPaybackData,
            });
          } catch (err) {
            console.error("Failed to load live data:", err);
            // Continue with default values if API call fails
          }
        }

        setDataLoaded(true);
        setLoading(false);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.detail);
        } else {
          setError(t("devices.loadError") || "Failed to load device data");
        }
        setLoading(false);
      }
    };

    loadData();
  }, [token, deviceId, t]);

  // Pusher connection - hook must be called at top level
  const { status: wsStatus } = useWebSocket(
    installationId,
    token,
    handleWebSocketMessage,
  );

  // Log websocket connection status
  useEffect(() => {
    console.log("[Dashboard] 🔌 WebSocket connection status:", {
      status: wsStatus,
      installationId: installationId,
      hasToken: !!token,
    });
  }, [wsStatus, installationId, token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2" style={{ color: "#6b7280" }}>
            {t("common.loading")}
          </div>
          <div className="text-sm" style={{ color: "#9ca3af" }}>
            {t("devices.loadingDeviceData") || "Loading device data..."}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg mb-2" style={{ color: "#ef4444" }}>
            {t("common.error")}
          </div>
          <div className="text-sm mb-4" style={{ color: "#6b7280" }}>
            {error}
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 rounded-md transition-colors mr-2 bg-surface border border-border text-text hover:bg-border"
          >
            {t("devices.backToDevices") || "Back to Devices"}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md transition-colors bg-accent-1 text-text hover:bg-accent-1/90"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <div>
                <h1 className="text-2xl font-bold text-text">
                  {t("dashboard.title")} - {device?.name}
                </h1>
                <button
                  onClick={() => router.push("/")}
                  className="text-sm mt-1"
                  style={{ color: "#6b7280" }}
                >
                  ← {t("devices.backToDevices") || "Back to Devices"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Reorganized Grid Layout */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="space-y-4">
          {/* Rows 1-2: Weather (2 cols, 2 rows) + Other cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            {/* Weather Card - First position, 2 cols, spans 2 rows */}
            <div className="md:col-span-2 md:row-span-2 flex">
              <WeatherWidget
                installationId={installationId}
                installation={installation}
                token={token}
                className="w-full max-h-[360px]"
              />
            </div>

            {/* Row 1: Time, Main Meter, Phase Currents, Energy Flow */}
            <div className="md:col-span-2">
              <DateTimeWidget installation={installation} />
            </div>
            <div className="md:col-span-4 flex relative">
              <MainMeter
                importKw={meterData?.importKw ?? 0}
                exportKw={meterData?.exportKw ?? 0}
                importKwh={meterData?.importKwh ?? 0}
                exportKwh={meterData?.exportKwh ?? 0}
                highImportWarning={meterData?.highImportWarning ?? false}
                zeroExportActive={meterData?.zeroExportActive ?? false}
                className="w-full"
              />
              {!meterData && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-lg backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-sm text-text-muted">
                      {t("dashboard.waitingForData")}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex relative">
              <PhaseCurrents
                l1Current={meterData?.l1Current ?? 0}
                l2Current={meterData?.l2Current ?? 0}
                l3Current={meterData?.l3Current ?? 0}
                className="w-full"
              />
              {!meterData && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-lg backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-sm text-text-muted">
                      {t("dashboard.waitingForData")}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex relative">
              <EnergyFlowDiagram
                solarPower={inverters.reduce((sum, inv) => sum + inv.power, 0)}
                batteryPower={batteryData?.power ?? 0}
                batterySoC={batteryData?.soc ?? 0}
                gridImport={meterData?.importKw ?? 0}
                gridExport={meterData?.exportKw ?? 0}
                homeConsumption={
                  inverters.reduce((sum, inv) => sum + inv.power, 0) +
                  ((meterData?.importKw ?? 0) - (meterData?.exportKw ?? 0)) +
                  (batteryData?.power ?? 0)
                }
                className="w-full"
              />
              {!meterData && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-lg backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-sm text-text-muted">
                      {t("dashboard.waitingForData")}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Position 1: Energy Overview and Solar Power stacked vertically */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="card p-4 flex-1 relative overflow-hidden">
                {/* Dynamic Background Line Graph based on KPI values */}
                {(() => {
                  // Normalize values to 0-100 scale for the graph
                  const savingsNorm = Math.min(
                    100,
                    (financialKPIs.savings.day / 50) * 100,
                  ); // Max €50
                  const autonomyNorm = financialKPIs.autonomyPercentage; // Already 0-100
                  const arbitrageNorm = financialKPIs.arbitrageScore; // Already 0-100
                  const evNorm = Math.min(
                    100,
                    (financialKPIs.evChargingMargins / 20) * 100,
                  ); // Max €20

                  // Convert to Y positions (inverted because SVG Y goes down)
                  const points = [
                    { x: 0, y: 100 - savingsNorm * 0.7 - 10 },
                    { x: 50, y: 100 - autonomyNorm * 0.7 - 10 },
                    { x: 100, y: 100 - arbitrageNorm * 0.7 - 10 },
                    { x: 150, y: 100 - evNorm * 0.7 - 10 },
                    {
                      x: 200,
                      y: 100 - ((savingsNorm + autonomyNorm) / 2) * 0.7 - 10,
                    },
                  ];

                  // Create smooth curve path
                  const linePath = `M${points[0].x},${points[0].y} C${points[0].x + 15},${points[0].y} ${points[1].x - 15},${points[1].y} ${points[1].x},${points[1].y} S${points[2].x - 15},${points[2].y} ${points[2].x},${points[2].y} S${points[3].x - 15},${points[3].y} ${points[3].x},${points[3].y} S${points[4].x - 15},${points[4].y} ${points[4].x},${points[4].y}`;
                  const areaPath = `${linePath} L200,100 L0,100 Z`;

                  return (
                    <div className="absolute inset-0 opacity-25 pointer-events-none">
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 200 100"
                        preserveAspectRatio="none"
                      >
                        <defs>
                          <linearGradient
                            id="energyGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                            <stop
                              offset="0%"
                              stopColor="#10b981"
                              stopOpacity="0.5"
                            />
                            <stop
                              offset="100%"
                              stopColor="#10b981"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#energyGradient)" />
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeOpacity="0.8"
                        />
                        {/* Data points */}
                        {points.slice(0, 4).map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="3"
                            fill="#10b981"
                            fillOpacity="0.6"
                          />
                        ))}
                      </svg>
                    </div>
                  );
                })()}
                {/* Content */}
                <div className="relative z-10">
                  <div className="text-xs uppercase mb-3 text-text-muted">
                    {t("energy.overview")}
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#6b7280" }}
                        >
                          {t("financial.savings")}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{ color: "#10b981" }}
                        >
                          €{financialKPIs.savings.day.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#6b7280" }}
                        >
                          {t("financial.autonomy")}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{ color: "#10b981" }}
                        >
                          {financialKPIs.autonomyPercentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#6b7280" }}
                        >
                          {t("financial.arbitrageScore")}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{ color: "#3b82f6" }}
                        >
                          {financialKPIs.arbitrageScore.toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#6b7280" }}
                        >
                          {t("financial.evChargingMargins")}
                        </div>
                        <div
                          className="text-xl font-bold"
                          style={{ color: "#8b5cf6" }}
                        >
                          €{financialKPIs.evChargingMargins.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {inverters.length > 0 && (
                <div className="card p-6 flex-1 flex flex-col">
                  <div className="text-xs uppercase mb-4 text-text-muted">
                    {t("energy.solarPower")}
                  </div>
                  <div className="flex-1">
                    {inverters[
                      Math.min(activeInverterTab, inverters.length - 1)
                    ] && (
                      <InverterCard
                        inverterNumber={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].number
                        }
                        power={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].power
                        }
                        ratedPower={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].ratedPower
                        }
                        curtailment={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].curtailment
                        }
                        status={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].status
                        }
                        curtailmentReason={
                          inverters[
                            Math.min(activeInverterTab, inverters.length - 1)
                          ].curtailmentReason
                        }
                      />
                    )}
                  </div>
                  {/* Pagination - only when more than 1 inverter */}
                  {inverters.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border">
                      <button
                        onClick={() =>
                          setActiveInverterTab(
                            Math.max(0, activeInverterTab - 1),
                          )
                        }
                        disabled={activeInverterTab === 0}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border/60"
                        aria-label="Previous inverter"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-text-muted"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <div className="flex items-center gap-1.5">
                        {inverters.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveInverterTab(i)}
                            className={`w-2 h-2 rounded-full transition-all duration-200 ${
                              activeInverterTab === i
                                ? "bg-accent-1 w-5"
                                : "bg-border hover:bg-text-muted"
                            }`}
                            aria-label={`Inverter ${i + 1}`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() =>
                          setActiveInverterTab(
                            Math.min(
                              inverters.length - 1,
                              activeInverterTab + 1,
                            ),
                          )
                        }
                        disabled={activeInverterTab === inverters.length - 1}
                        className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border/60"
                        aria-label="Next inverter"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-text-muted"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="md:col-span-2 relative">
              <div className="card p-6 h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="text-xs uppercase text-text-muted">
                    {t("dashboard.battery")}
                  </div>
                  <div
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      color:
                        (batteryData?.status ?? "idle") === "charging"
                          ? "#10b981"
                          : (batteryData?.status ?? "idle") === "discharging"
                            ? "#00CED1"
                            : "#718096",
                      backgroundColor:
                        (batteryData?.status ?? "idle") === "charging"
                          ? "#10b98133"
                          : (batteryData?.status ?? "idle") === "discharging"
                            ? "#00CED133"
                            : "#71809633",
                    }}
                  >
                    {(batteryData?.status ?? "idle") === "charging"
                      ? t("battery.charging")
                      : (batteryData?.status ?? "idle") === "discharging"
                        ? t("battery.discharging")
                        : t("battery.idle")}
                  </div>
                </div>
                <BatteryEnhanced
                  soc={batteryData?.soc ?? 0}
                  capacity={batteryData?.capacity ?? 0}
                  power={batteryData?.power ?? 0}
                  status={batteryData?.status ?? "idle"}
                  eveningReserve={batteryData?.eveningReserve ?? 30}
                  minimumReserve={batteryData?.minimumReserve ?? 20}
                  availableCapacity={batteryData?.availableCapacity}
                  batteryCapacity={batteryData?.batteryCapacity}
                  batteryBuffer={batteryData?.batteryBuffer}
                />
              </div>
              {!batteryData && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/80 rounded-lg backdrop-blur-sm z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin mx-auto mb-2"></div>
                    <span className="text-sm text-text-muted">
                      {t("dashboard.waitingForData")}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="md:col-span-6">
              <EVChargersGrid chargers={evChargers} />
            </div>
          </div>

          {/* Row 3: Generator */}
          {generator && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-2">
                <Generator
                  status={generator.status}
                  fuelConsumption={generator.fuelConsumption}
                  chargingPower={generator.chargingPower}
                  fuelCost={generator.fuelCost}
                  autoStartReason={generator.autoStartReason}
                />
              </div>
            </div>
          )}

          {/* Row 3: Revenue Charts - 5 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            {/* 1. Self-Consumption Revenue */}
            <div className="md:col-span-2">
              <div className="card p-4 h-full">
                <div className="text-xs uppercase mb-3 text-text-muted">
                  {t("revenueCharts.selfConsumption")}
                </div>
                <div className="h-[180px]">
                  <RevenueCharts
                    selfConsumptionData={revenueData.selfConsumption}
                    feedInData={[]}
                    arbitrageData={[]}
                    evChargingData={[]}
                    totalPaybackData={[]}
                    className="h-full"
                    showOnly="selfConsumption"
                  />
                </div>
              </div>
            </div>

            {/* 2. Feed-in Revenue */}
            <div className="md:col-span-2">
              <div className="card p-4 h-full">
                <div className="text-xs uppercase mb-3 text-text-muted">
                  {t("revenueCharts.feedIn")}
                </div>
                <div className="h-[180px]">
                  <RevenueCharts
                    selfConsumptionData={[]}
                    feedInData={revenueData.feedIn}
                    arbitrageData={[]}
                    evChargingData={[]}
                    totalPaybackData={[]}
                    className="h-full"
                    showOnly="feedIn"
                  />
                </div>
              </div>
            </div>

            {/* 3. Arbitrage Revenue */}
            <div className="md:col-span-3">
              <div className="card p-4 h-full">
                <div className="text-xs uppercase mb-3 text-text-muted">
                  {t("revenueCharts.arbitrage")}
                </div>
                <div className="h-[180px]">
                  <RevenueCharts
                    selfConsumptionData={[]}
                    feedInData={[]}
                    arbitrageData={revenueData.arbitrage}
                    evChargingData={[]}
                    totalPaybackData={[]}
                    className="h-full"
                    showOnly="arbitrage"
                  />
                </div>
              </div>
            </div>

            {/* 4. EV Charging Revenue */}
            <div className="md:col-span-2">
              <div className="card p-4 h-full">
                <div className="text-xs uppercase mb-3 text-text-muted">
                  {t("revenueCharts.evCharging")}
                </div>
                <div className="h-[180px]">
                  <RevenueCharts
                    selfConsumptionData={[]}
                    feedInData={[]}
                    arbitrageData={[]}
                    evChargingData={revenueData.evCharging}
                    totalPaybackData={[]}
                    className="h-full"
                    showOnly="evCharging"
                  />
                </div>
              </div>
            </div>

            {/* 5. Total Payback */}
            <div className="md:col-span-3">
              <div className="card p-4 h-full">
                <div className="text-xs uppercase mb-3 text-text-muted">
                  {t("revenueCharts.totalPayback")}
                </div>
                <div className="h-[180px]">
                  <RevenueCharts
                    selfConsumptionData={[]}
                    feedInData={[]}
                    arbitrageData={[]}
                    evChargingData={[]}
                    totalPaybackData={revenueData.totalPayback}
                    className="h-full"
                    showOnly="totalPayback"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DeviceDashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
