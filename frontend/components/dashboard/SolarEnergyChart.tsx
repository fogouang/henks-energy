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

interface SolarDataPoint {
  hour: string;
  kwh: number;
  eur: number;
  price: number | null;
}

interface SolarEnergyChartProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function SolarEnergyChart({ installationId, token, className }: SolarEnergyChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<SolarDataPoint[]>([]);
  const [totalKwh, setTotalKwh] = useState(0);
  const [totalEur, setTotalEur] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId || !token) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await installationsApi.getSolarEnergy(installationId, period, token);
        setData(json.data || []);
        setTotalKwh(json.total_kwh || 0);
        setTotalEur(json.total_eur || 0);
      } catch (err) {
        console.error('Failed to load solar energy data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [installationId, token, period]);

  const labels = data.map(d => {
    const date = new Date(d.hour);
    if (period === 'day') return `${date.getHours()}:00`;
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit' });
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: '€',
        data: data.map(d => d.eur),
        backgroundColor: '#f97316cc',
        borderColor: '#f97316',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">Solar Energy</h3>
          <span className="text-xs text-text-muted">{totalKwh.toFixed(1)} kWh · €{totalEur.toFixed(2)}</span>
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
                    title: (items) => {
                      const d = data[items[0].dataIndex];
                      return new Date(d.hour).toLocaleString('nl-NL');
                    },
                    label: (item) => {
                      const d = data[item.dataIndex];
                      return [
                        `€${d.eur.toFixed(3)}`,
                        `${d.kwh.toFixed(2)} kWh`,
                        d.price ? `Price: €${d.price.toFixed(4)}/kWh` : '',
                      ];
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
                y: { ticks: { color: '#6b7280', font: { size: 10 }, callback: (v) => `€${v}` }, grid: { color: 'rgba(255,255,255,0.05)' } },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}