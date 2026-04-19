'use client';

/**
 * Main Meter Component
 */

import React, { useRef, useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';

ChartJS.register(ArcElement, Tooltip, Legend);

interface MainMeterProps {
  importKw: number;
  exportKw: number;
  importKwh?: number;
  exportKwh?: number;
  highImportWarning?: boolean;
  zeroExportActive?: boolean;
  className?: string;
}

const MAX_POWER_KW = 15;

interface MeterDonutProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  colorEnd?: string;
  displayValue: string;
  subLabel?: string;
}

function MeterDonut({
  label,
  value,
  maxValue,
  color,
  colorEnd,
  displayValue,
  subLabel,
}: MeterDonutProps) {
  const chartRef = useRef<ChartJS<'doughnut'>>(null);
  const [gradient, setGradient] = useState<CanvasGradient | string>(color);
  
  const safeMaxValue = maxValue > 0 ? maxValue : 1;
  const safeValue = Math.max(0, Math.min(value, safeMaxValue));
  const remainderValue = Math.max(0, safeMaxValue - safeValue);

  useEffect(() => {
    const chart = chartRef.current;
    if (chart) {
      const ctx = chart.ctx;
      const chartArea = chart.chartArea;
      if (ctx && chartArea) {
        const grad = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        grad.addColorStop(0, color);
        grad.addColorStop(1, colorEnd || color);
        setGradient(grad);
      }
    }
  }, [color, colorEnd]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[96px] w-[96px]">
        <Doughnut
          ref={chartRef}
          data={{
            labels: [label, ''],
            datasets: [
              {
                data: [safeValue, remainderValue],
                backgroundColor: [gradient, 'rgba(74, 85, 104, 0.3)'],
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-semibold text-text">{displayValue}</span>
        </div>
      </div>
      <div className="mt-2 text-sm text-text-muted">{label}</div>
      {subLabel && <div className="text-xs text-text-muted">{subLabel}</div>}
    </div>
  );
}

export function MainMeter({
  importKw,
  exportKw,
  importKwh,
  exportKwh,
  highImportWarning,
  zeroExportActive,
  className,
}: MainMeterProps) {
  const { t } = useLanguage();
  const netKw = exportKw - importKw;
  const netValue = Math.abs(netKw);
  const netDisplay = `${netKw >= 0 ? '+' : ''}${netKw.toFixed(2)} kW`;
  const importDisplay = `${importKw.toFixed(2)} kW`;
  const exportDisplay = `${exportKw.toFixed(2)} kW`;

  return (
    <div className={`card p-4 flex flex-col h-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs uppercase text-text-muted">{t('meter.title')}</div>
        <div className="flex items-center">
          {netKw > 0 ? (
            <div className="flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium bg-success/20 text-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 4L20 12H16V20H8V12H4L12 4Z" fill="currentColor" />
              </svg>
              <span>{t('meter.exportingToGrid')}</span>
            </div>
          ) : netKw < 0 ? (
            <div className="flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium bg-critical/20 text-critical">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ transform: 'rotate(180deg)' }}>
                <path d="M12 4L20 12H16V20H8V12H4L12 4Z" fill="currentColor" />
              </svg>
              <span>{t('meter.importingFromGrid')}</span>
            </div>
          ) : (
            <div className="rounded-full px-2 py-1 text-xs font-medium bg-border/60 text-text-muted">
              {t('meter.balanced')}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Warnings */}
        {highImportWarning && (
          <div className="p-2 rounded text-xs text-center bg-critical/20 border border-critical/50 text-critical">
            {t('meter.highImportWarning')}
          </div>
        )}
        {zeroExportActive && (
          <div className="p-2 rounded text-xs text-center bg-warning/20 border border-warning/50 text-warning">
            {t('meter.zeroExportWarning')}
          </div>
        )}

        {/* Donut Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MeterDonut
            label={t('meter.import')}
            value={importKw}
            maxValue={MAX_POWER_KW}
            color="#ef4444"
            colorEnd="#f97316"
            displayValue={importDisplay}
            subLabel={importKwh !== undefined ? `${importKwh.toFixed(2)} kWh` : undefined}
          />
          <MeterDonut
            label={t('meter.export')}
            value={exportKw}
            maxValue={MAX_POWER_KW}
            color="#10b981"
            colorEnd="#00CED1"
            displayValue={exportDisplay}
            subLabel={exportKwh !== undefined ? `${exportKwh.toFixed(2)} kWh` : undefined}
          />
          <MeterDonut
            label={t('meter.net')}
            value={netValue}
            maxValue={MAX_POWER_KW}
            color={netKw >= 0 ? '#10b981' : '#ef4444'}
            colorEnd={netKw >= 0 ? '#00CED1' : '#f97316'}
            displayValue={netDisplay}
          />
        </div>
      </div>
    </div>
  );
}

