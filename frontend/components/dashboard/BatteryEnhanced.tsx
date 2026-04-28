"use client";
import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";

ChartJS.register(ArcElement, Tooltip);

interface BatteryEnhancedProps {
  soc: number;
  capacity: number;
  power: number;
  status?: "charging" | "discharging" | "idle";     // ← On la rend optionnelle
  eveningReserve?: number;
  minimumReserve?: number;
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
  status,                    // ← On la garde mais on ne l’utilise pas forcément
  className,
}: BatteryEnhancedProps) {
  const available = availableCapacity ?? capacity ?? 0;
  const totalCapacity = batteryCapacity ?? capacity ?? 1;
  const buffer = Math.max(0, batteryBuffer ?? 20);

  const availablePct = totalCapacity > 0 
    ? Math.min(Math.max((available / totalCapacity) * 100, 0), 100) 
    : 0;

  // On peut utiliser `status` en priorité, sinon on déduit du power
  const isCharging = status === "charging" || (status === undefined && power >= 0);
  const statusColor = isCharging ? "#10b981" : "#ef4444";

  const bufferColor = availablePct < 20 ? "#f97316" : "#ef4444";

  const data = availablePct <= buffer 
    ? [availablePct, 100 - availablePct] 
    : [buffer, availablePct - buffer, 100 - availablePct];

  const backgroundColor = availablePct <= buffer 
    ? [bufferColor, "rgba(74,85,104,0.15)"] 
    : [bufferColor, "#10b981", "rgba(74,85,104,0.15)"];

  const chartData = {
    datasets: [
      {
        data: data,
        backgroundColor: backgroundColor,
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className={`flex flex-col items-center h-full ${className || ""}`}>
      <div className="relative w-[200px] h-[200px]">
        <Doughnut
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            rotation: -90,
            circumference: 360,
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-bold text-white">
            {availablePct.toFixed(0)}%
          </span>
          <span className="text-sm text-gray-400 mt-1">
            {available.toFixed(1)} kWh
          </span>
          <span
            className="text-base font-semibold mt-2"
            style={{ color: statusColor }}
          >
            {power > 0 ? "+" : ""}
            {power.toFixed(2)} kW
          </span>
        </div>
      </div>

      <div 
        className="mt-4 text-lg font-bold" 
        style={{ color: statusColor }}
      >
        {power > 0 ? "+" : ""}
        {power.toFixed(2)} kW
      </div>

      <div className="mt-6 w-full max-w-[180px] space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Available</span>
          <span className="font-semibold text-white">
            {availablePct.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Buffer</span>
          <span className="font-semibold text-white">{buffer}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Capacity</span>
          <span className="font-semibold text-white">
            {totalCapacity.toFixed(1)} kWh
          </span>
        </div>
      </div>
    </div>
  );
}