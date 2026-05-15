"use client";

import { useState, useEffect } from "react";
import { Chart } from "react-chartjs-2";
import { installationsApi } from "@/lib/api/client";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
);

interface EarningsDataPoint {
  period: string;
  solar_kw: number;
  solar_earnings: number;
  grid_net_kw: number;
  grid_earnings: number;
  epex_price: number | null;
  manual_price: number;
  total_earnings: number;
}

interface EnergyEarningsChartProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function EnergyEarningsChart({
  installationId,
  token,
  className,
}: EnergyEarningsChartProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [data, setData] = useState<EarningsDataPoint[]>([]);
  const [totals, setTotals] = useState({
    solar: 0,
    grid: 0,
    total: 0,
    manual_price: 0.25,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId || !token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await installationsApi.getEnergyEarnings(
          installationId,
          period,
          token,
        );
        setData(json.data || []);
        setTotals({
          solar: json.total_solar_earnings,
          grid: json.total_grid_earnings,
          total: json.total_earnings,
          manual_price: json.manual_price,
        });
      } catch (err) {
        console.error("Failed to load energy earnings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [installationId, token, period]);

  const labels = data.map((d) => {
    const date = new Date(d.period);
    if (period === "day") return `${date.getHours()}:00`;
    return date.toLocaleDateString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
    });
  });

  const chartData = {
    labels,
    datasets: [
      {
        type: "line" as const,
        label: "Solar €",
        data: data.map((d) => d.solar_earnings),
        borderColor: "#f97316",
        backgroundColor: "#f97316",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 1.5,
        showLine: true,
      },
      {
        type: "line" as const,
        label: "Grid €",
        data: data.map((d) => d.grid_earnings),
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 1.5,
        showLine: true,
      },
    ],
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Energy Earnings</h3>
          <span className="text-xs text-text-muted">
            Total: €{totals.total.toFixed(2)} · Price: €
            {totals.manual_price.toFixed(2)}/kWh
          </span>
        </div>
        <div className="flex gap-1">
          {(["day", "week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-xs rounded ${period === p ? "bg-accent-1 text-white" : "bg-border text-text-muted"}`}
            >
              {p === "day" ? "Day" : p === "week" ? "Week" : "Month"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1" style={{ minHeight: "180px" }}>
          <Chart
            type="line"
            data={chartData as any}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item) => {
                      const d = data[item.dataIndex];
                      return [
                        `Solar: €${d.solar_earnings.toFixed(3)} (${d.solar_kw.toFixed(2)} kW)`,
                        `Grid: €${d.grid_earnings.toFixed(3)} (${d.grid_net_kw.toFixed(2)} kW)`,
                        d.epex_price
                          ? `EPEX: €${d.epex_price.toFixed(4)}/kWh`
                          : "",
                        `Manual: €${d.manual_price.toFixed(4)}/kWh`,
                        `Total: €${d.total_earnings.toFixed(3)}`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: {
                  ticks: { color: "#6b7280", font: { size: 10 } },
                  grid: { display: false },
                },
                y: {
                  ticks: {
                    color: "#6b7280",
                    font: { size: 10 },
                    callback: (v) => `€${v}`,
                  },
                  grid: { color: "rgba(255,255,255,0.05)" },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
