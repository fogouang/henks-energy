'use client';

/**
 * Battery State of Charge (SoC) Donut Chart Component
 */

import React from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

interface BatterySoCProps {
  soc: number; // 0-100
  capacity: number; // kWh
  power: number; // kW (positive = charging, negative = discharging)
  status: 'charging' | 'discharging' | 'idle';
  className?: string;
}

export function BatterySoC({ soc, capacity, power, status, className }: BatterySoCProps) {
  const getStatusColor = () => {
    if (status === 'charging') return '#10b981';
    if (status === 'discharging') return '#00CED1';
    return '#718096';
  };

  const filledColor = getStatusColor();
  const remainder = Math.max(0, 100 - soc);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <div className="h-[160px] w-[160px]">
          <Doughnut
            data={{
              labels: ['SoC', 'Remaining'],
              datasets: [
                {
                  data: [Math.max(0, soc), remainder],
                  backgroundColor: [filledColor, '#4A5568'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              cutout: '70%',
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
              },
            }}
          />
        </div>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-text">{Math.round(soc)}%</span>
          <span className="text-sm text-text-muted">{capacity.toFixed(1)} kWh</span>
        </div>
      </div>
      {/* Power indicator */}
      <div className="mt-4 text-center">
        <div className="text-lg font-semibold" style={{ color: filledColor }}>
          {power > 0 ? '+' : ''}{power.toFixed(2)} kW
        </div>
        <div className="text-sm capitalize text-text-muted">{status}</div>
      </div>
    </div>
  );
}

