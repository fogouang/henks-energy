"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
ChartJS.register(ArcElement, Tooltip);

interface BatteryEnhancedProps {
  soc: number;
  capacity: number;
  power: number;
  status: "charging" | "discharging" | "idle";
  eveningReserve: number;
  minimumReserve: number;
  availableCapacity?: number | null;
  batteryCapacity?: number | null;
  batteryBuffer?: number | null;
  className?: string;
}

export function BatteryEnhanced({
  power,
  availableCapacity,
  batteryCapacity,
  batteryBuffer = 20,
  soc,
  capacity,
  className,
}: BatteryEnhancedProps) {
  const available = availableCapacity ?? 0;
  const totalCapacity = batteryCapacity ?? capacity ?? 1;
  const buffer = batteryBuffer ?? 20;
  const availablePct =
    totalCapacity > 0 ? (available / totalCapacity) * 100 : 0;
  const isCharging = power >= 0;
  const isAboveBuffer = availablePct > buffer;
  const statusColor = isCharging ? "#10b981" : "#ef4444";
  const remainder = 100 - availablePct;

  const chartData = {
    datasets: [
      {
        data: isAboveBuffer
          ? [buffer, availablePct - buffer, remainder]
          : [availablePct, remainder],
        backgroundColor: isAboveBuffer
          ? ["#ef4444", "#10b981", "rgba(74,85,104,0.15)"]
          : ["#f97316", "rgba(74,85,104,0.15)"],
        borderWidth: 1,
        borderColor: "#1a1f2e",
        hoverBorderWidth: 0,
      },
    ],
  };

  return (
    <div className={`flex flex-col items-center h-full ${className}`}>
      <div className="relative w-[180px] h-[180px]">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            cutout: "70%",
            rotation: 0,
            circumference: 360,
            animation: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text">
            {availablePct.toFixed(0)}%
          </span>
          <span className="text-xs text-text-muted">
            {available.toFixed(1)} kWh
          </span>
          <span
            className="text-xs font-semibold mt-1"
            style={{ color: statusColor }}
          >
            {power > 0 ? "+" : ""}
            {power.toFixed(2)} kW
          </span>
        </div>
      </div>

      {/* Power value instead of CHARGING/DISCHARGING label */}
      <div className="mt-3 text-sm font-bold" style={{ color: statusColor }}>
        {power > 0 ? "+" : ""}
        {power.toFixed(2)} kW
      </div>

      <div className="mt-3 w-full space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Available</span>
          <span className="font-semibold text-text">
            {availablePct.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Buffer</span>
          <span className="font-semibold text-text">{buffer}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Capacity</span>
          <span className="font-semibold text-text">
            {totalCapacity.toFixed(1)} kWh
          </span>
        </div>
      </div>
    </div>
  );
}
