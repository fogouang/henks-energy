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

interface ChargerDataPoint {
  period: string;
  kwh: number;
  revenue: number;
}

interface ChargerPowerChartProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function ChargerPowerChart({ installationId, token, className }: ChargerPowerChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [data, setData] = useState<ChargerDataPoint[]>([]);
  const [chargingPrice, setChargingPrice] = useState(0.35);
  const [totalKwh, setTotalKwh] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!installationId || !token) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const json = await installationsApi.getChargerPower(installationId, period, token);
        setData(json.data || []);
        setChargingPrice(json.charging_price);
        setTotalKwh(json.total_kwh);
        setTotalRevenue(json.total_revenue);
      } catch (err) {
        console.error('Failed to load charger power data:', err);
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
        label: 'kWh',
        data: data.map(d => d.kwh),
        backgroundColor: '#3b82f6cc',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 3,
      },
    ],
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-text">EV Charging Power</h3>
          <span className="text-xs text-text-muted">
            {totalKwh.toFixed(1)} kWh · €{totalRevenue.toFixed(2)} · €{chargingPrice.toFixed(2)}/kWh
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
                        `${d.kwh.toFixed(2)} kWh`,
                        `€${d.revenue.toFixed(2)}`,
                      ];
                    },
                  },
                },
              },
              scales: {
                x: { ticks: { color: '#6b7280', font: { size: 10 } }, grid: { display: false } },
                y: {
                  ticks: { color: '#6b7280', font: { size: 10 }, callback: (v) => `${v} kWh` },
                  grid: { color: 'rgba(255,255,255,0.05)' },
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}