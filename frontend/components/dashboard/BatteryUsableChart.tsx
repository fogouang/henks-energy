'use client';

import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { installationsApi } from '@/lib/api/client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface BatteryUsableDataPoint {
  period: string;
  usable_kwh: number;
  available_kwh: number | null;
  soc_percentage: number;
}

interface BatteryUsableChartProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function BatteryUsableChart({ installationId, token, className }: BatteryUsableChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<BatteryUsableDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId || !token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await installationsApi.getBatteryUsable(installationId, period, token);
        setData(json.data || []);
      } catch (err) {
        console.error('Failed to load battery usable data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [installationId, token, period]);

  const labels = data.map(d => {
    const date = new Date(d.period);
    if (period === 'day') return `${date.getHours()}:00`;
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Usable kWh',
        data: data.map(d => d.usable_kwh),
        backgroundColor: '#10b981cc',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Battery Usable</h3>
          <span className="text-xs text-text-muted">
            {data.length > 0 ? `${data[data.length - 1].usable_kwh.toFixed(1)} kWh` : '—'}
          </span>
        </div>
        <div className="flex gap-1">
          {(['day', 'week', 'month'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 text-xs rounded ${period === p ? 'bg-accent-1 text-white' : 'bg-border text-text-muted'}`}
            >
              {p === 'day' ? 'Day' : p === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-accent-1/30 border-t-accent-1 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1" style={{ minHeight: '180px' }}>
          <Bar
            data={chartData}
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
                        `Usable: ${d.usable_kwh.toFixed(2)} kWh`,
                        d.available_kwh ? `Available: ${d.available_kwh.toFixed(2)} kWh` : '',
                        `SoC: ${d.soc_percentage.toFixed(1)}%`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#6b7280', font: { size: 10 }, callback: (v) => `${v} kWh` }, grid: { color: 'rgba(255,255,255,0.05)' } },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}