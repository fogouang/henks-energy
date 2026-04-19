'use client';

/**
 * Enhanced Battery Component with Donut Chart
 * Shows three segments: Green (usable), Yellow (evening reserve), Red (lifespan buffer 20%)
 */

import React, { useRef, useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface BatteryEnhancedProps {
  soc: number; // 0-100
  capacity: number; // kWh
  power: number; // kW (positive = charging, negative = discharging)
  status: 'charging' | 'discharging' | 'idle';
  eveningReserve: number; // Percentage for evening usage (e.g., 30%)
  minimumReserve: number; // Minimum reserve to protect lifespan (default 20%)
  className?: string;
}

export function BatteryEnhanced({
  soc,
  capacity,
  power,
  status,
  eveningReserve,
  minimumReserve = 20,
  className,
}: BatteryEnhancedProps) {
  const { t } = useLanguage();
  const chartRef = useRef<ChartJS<'doughnut'>>(null);
  const [gradients, setGradients] = useState<(CanvasGradient | string)[]>(['#ef4444', '#f59e0b', '#10b981', 'rgba(74, 85, 104, 0.3)']);

  // Calculate segment percentages
  // Reserve: 0% to minimumReserve% (always present if soc > 0)
  // Evening: minimumReserve% to eveningReserve% (if soc > minimumReserve)
  // Usable: eveningReserve% to soc% (if soc > eveningReserve)
  
  const reservePercent = Math.min(minimumReserve, soc);
  const eveningPercent = soc > minimumReserve 
    ? Math.min(eveningReserve - minimumReserve, soc - minimumReserve)
    : 0;
  const usablePercent = soc > eveningReserve 
    ? soc - eveningReserve
    : 0;
  const remainderPercent = Math.max(0, 100 - soc);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (ctx && chartArea) {
        // Create radial-like gradients for donut segments
        const redGrad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        redGrad.addColorStop(0, '#dc2626');
        redGrad.addColorStop(1, '#f87171');
        
        const yellowGrad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        yellowGrad.addColorStop(0, '#d97706');
        yellowGrad.addColorStop(1, '#fbbf24');
        
        const greenGrad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        greenGrad.addColorStop(0, '#059669');
        greenGrad.addColorStop(1, '#34d399');
        
        setGradients([redGrad, yellowGrad, greenGrad, 'rgba(74, 85, 104, 0.3)']);
      }
    }
  }, []);

  // Determine warning status
  const isBelowReserve = soc < minimumReserve;
  const isBelowEvening = soc < eveningReserve && soc >= minimumReserve;

  const getStatusColor = () => {
    if (status === 'charging') return '#10b981';
    if (status === 'discharging') return '#00CED1';
    return '#718096';
  };

  const getWarningMessage = () => {
    if (isBelowReserve) {
      return { text: t('battery.belowMinimum'), color: '#ef4444' };
    }
    if (isBelowEvening) {
      return { text: t('battery.belowEvening'), color: '#f59e0b' };
    }
    return null;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="h-[200px] w-[200px]">
          <Doughnut
            ref={chartRef}
            data={{
              labels: [
                t('battery.lifespanBuffer'),
                t('battery.eveningReserve'),
                t('battery.usable'),
                '',
              ],
              datasets: [
                {
                  data: [
                    reservePercent,
                    eveningPercent,
                    usablePercent,
                    remainderPercent,
                  ],
                  backgroundColor: gradients,
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
          <span className="text-4xl font-bold text-text">
            {Math.round(soc)}%
          </span>
          <span className="text-sm text-text-muted">
            {capacity.toFixed(1)} kWh
          </span>
          <div className="mt-2 text-xs font-semibold" style={{ color: getStatusColor() }}>
            {power > 0 ? '+' : ''}{power.toFixed(2)} kW
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
            <span className="text-text-muted">{t('battery.usable')}</span>
          </div>
          <span className="font-semibold text-text">
            {usablePercent.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
            <span className="text-text-muted">{t('battery.eveningReserve')} ({eveningReserve}%)</span>
          </div>
          <span className="font-semibold text-text">
            {eveningPercent.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
            <span className="text-text-muted">{t('battery.lifespanBuffer')} ({minimumReserve}%)</span>
          </div>
          <span className="font-semibold text-text">
            {reservePercent.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Warning message */}
      {getWarningMessage() && (
        <div
          className={`mt-4 p-2 rounded text-xs text-center font-medium ${
            getWarningMessage()!.color === '#ef4444' 
              ? 'bg-critical/20 border border-critical/50 text-critical'
              : 'bg-warning/20 border border-warning/50 text-warning'
          }`}
        >
          {getWarningMessage()!.text}
        </div>
      )}

    </div>
  );
}
