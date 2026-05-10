"use client";

import React, { useState, useEffect } from "react";
import { Bar, Chart } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import { installationsApi } from "@/lib/api/client";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
);

interface GridDataPoint {
  period: string;
  import_kw: number;
  export_kw: number;
  net_kw: number;
  price: number | null;
}

interface GridEnergyChartProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function GridEnergyChart({
  installationId,
  token,
  className,
}: GridEnergyChartProps) {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [data, setData] = useState<GridDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId || !token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await installationsApi.getGridEnergy(
          installationId,
          period,
          token,
        );
        setData(json.data || []);
      } catch (err) {
        console.error("Failed to load grid energy data:", err);
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
        type: "bar" as const,
        label: "Net kW",
        data: data.map((d) => d.net_kw),
        backgroundColor: data.map((d) =>
          d.net_kw >= 0 ? "#ef4444cc" : "#10b981cc",
        ),
        borderColor: data.map((d) => (d.net_kw >= 0 ? "#ef4444" : "#10b981")),
        borderWidth: 1,
        borderRadius: 3,
        yAxisID: "y",
      },
      {
        type: "line" as const,
        label: "EPEX €/kWh",
        data: data.map((d) => d.price),
        borderColor: "#f97316",
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 0,
        yAxisID: "y2",
      },
    ],
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Grid Energy</h3>
          <span className="text-xs text-text-muted">
            import_kw − export_kw · EPEX background
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
            type="bar"
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
                      if (item.datasetIndex === 0) {
                        return [
                          `Net: ${d.net_kw.toFixed(2)} kW`,
                          `Import: ${d.import_kw.toFixed(2)} kW`,
                          `Export: ${d.export_kw.toFixed(2)} kW`,
                        ];
                      }
                      return d.price ? `EPEX: €${d.price.toFixed(4)}/kWh` : "";
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
                    callback: (v) => `${v} kW`,
                  },
                  grid: { color: "rgba(255,255,255,0.05)" },
                },
                y2: {
                  position: "right",
                  ticks: {
                    color: "#f97316",
                    font: { size: 10 },
                    callback: (v) => `€${v}`,
                  },
                  grid: { display: false },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}
