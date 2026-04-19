'use client';

/**
 * Revenue Charts Component
 * Displays 5 different revenue models with charts
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

// Helper to create vertical gradient for area fills
function createVerticalGradient(ctx: CanvasRenderingContext2D, chartArea: { top: number; bottom: number }, colorTop: string, colorBottom: string) {
  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);
  return gradient;
}

// Helper to create horizontal gradient for bars
function createHorizontalGradient(ctx: CanvasRenderingContext2D, chartArea: { left: number; right: number }, colorStart: string, colorEnd: string) {
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

interface RevenueChartsProps {
  selfConsumptionData: Array<{ time: string; savings: number }>;
  feedInData: Array<{ time: string; revenue: number; price: number }>;
  arbitrageData: Array<{ time: string; chargePrice: number; dischargePrice: number; profit: number }>;
  evChargingData: Array<{ charger: number; revenue: number; margin: number }>;
  totalPaybackData: Array<{ date: string; cumulative: number }>;
  className?: string;
  showOnly?: 'selfConsumption' | 'feedIn' | 'arbitrage' | 'evCharging' | 'totalPayback';
}

export function RevenueCharts({
  selfConsumptionData,
  feedInData,
  arbitrageData,
  evChargingData,
  totalPaybackData,
  className,
  showOnly,
}: RevenueChartsProps) {
  const { t } = useLanguage();
  const axisColor = '#A0AEC0';
  const gridColor = '#4A5568';
  const tooltipColors = {
    backgroundColor: '#2D3748',
    borderColor: '#4A5568',
    titleColor: '#F7FAFC',
    bodyColor: '#F7FAFC',
  };

  const baseLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tooltipColors.backgroundColor,
        borderColor: tooltipColors.borderColor,
        borderWidth: 1,
        titleColor: tooltipColors.titleColor,
        bodyColor: tooltipColors.bodyColor,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: axisColor, font: { size: 10 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: axisColor, font: { size: 10 } },
      },
    },
  } as const;

  const baseBarOptions = {
    ...baseLineOptions,
  } as const;

  // Gradient-enabled chart components
  const SelfConsumptionChart = () => {
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [gradient, setGradient] = useState<CanvasGradient | string>('rgba(16, 185, 129, 0.35)');
    
    useEffect(() => {
      const chart = chartRef.current;
      if (chart?.ctx && chart?.chartArea) {
        setGradient(createVerticalGradient(chart.ctx, chart.chartArea, 'rgba(16, 185, 129, 0.5)', 'rgba(16, 185, 129, 0)'));
      }
    }, []);
    
    return (
      <Line
        ref={chartRef}
        options={baseLineOptions}
        data={{
          labels: selfConsumptionData.map(item => item.time),
          datasets: [{
            label: t('revenueCharts.savings'),
            data: selfConsumptionData.map(item => item.savings),
            borderColor: '#10b981',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          }],
        }}
      />
    );
  };

  const FeedInChart = () => {
    const chartRef = useRef<ChartJS<'bar'>>(null);
    const [gradient, setGradient] = useState<CanvasGradient | string>('#00CED1');
    
    useEffect(() => {
      const chart = chartRef.current;
      if (chart?.ctx && chart?.chartArea) {
        setGradient(createVerticalGradient(chart.ctx, chart.chartArea, '#00CED1', '#0891b2'));
      }
    }, []);
    
    return (
      <Bar
        ref={chartRef}
        options={baseBarOptions}
        data={{
          labels: feedInData.map(item => item.time),
          datasets: [{
            label: t('revenueCharts.revenue'),
            data: feedInData.map(item => item.revenue),
            backgroundColor: gradient,
            borderRadius: 4,
          }],
        }}
      />
    );
  };

  const ArbitrageChart = () => {
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [gradients, setGradients] = useState<(CanvasGradient | string)[]>(['rgba(79, 209, 199, 0.35)', 'rgba(255, 107, 53, 0.35)']);
    
    useEffect(() => {
      const chart = chartRef.current;
      if (chart?.ctx && chart?.chartArea) {
        setGradients([
          createVerticalGradient(chart.ctx, chart.chartArea, 'rgba(79, 209, 199, 0.5)', 'rgba(79, 209, 199, 0)'),
          createVerticalGradient(chart.ctx, chart.chartArea, 'rgba(255, 107, 53, 0.5)', 'rgba(255, 107, 53, 0)'),
        ]);
      }
    }, []);
    
    return (
      <Line
        ref={chartRef}
        options={baseLineOptions}
        data={{
          labels: arbitrageData.map(item => item.time),
          datasets: [
            {
              label: t('revenueCharts.chargePrice'),
              data: arbitrageData.map(item => item.chargePrice),
              borderColor: '#4FD1C7',
              backgroundColor: gradients[0],
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
            {
              label: t('revenueCharts.dischargePrice'),
              data: arbitrageData.map(item => item.dischargePrice),
              borderColor: '#FF6B35',
              backgroundColor: gradients[1],
              fill: true,
              tension: 0.35,
              pointRadius: 2,
            },
          ],
        }}
      />
    );
  };

  const EVChargingChart = () => {
    const chartRef = useRef<ChartJS<'bar'>>(null);
    const [gradients, setGradients] = useState<(CanvasGradient | string)[]>(['#8b5cf6', '#00CED1']);
    
    useEffect(() => {
      const chart = chartRef.current;
      if (chart?.ctx && chart?.chartArea) {
        setGradients([
          createVerticalGradient(chart.ctx, chart.chartArea, '#a78bfa', '#7c3aed'),
          createVerticalGradient(chart.ctx, chart.chartArea, '#00CED1', '#0891b2'),
        ]);
      }
    }, []);
    
    return (
      <Bar
        ref={chartRef}
        options={baseBarOptions}
        data={{
          labels: evChargingData.map(item => String(item.charger)),
          datasets: [
            {
              label: t('revenueCharts.revenue'),
              data: evChargingData.map(item => item.revenue),
              backgroundColor: gradients[0],
              borderRadius: 4,
            },
            {
              label: t('revenueCharts.marginVsGrid'),
              data: evChargingData.map(item => item.margin),
              backgroundColor: gradients[1],
              borderRadius: 4,
            },
          ],
        }}
      />
    );
  };

  const TotalPaybackChart = () => {
    const chartRef = useRef<ChartJS<'line'>>(null);
    const [gradient, setGradient] = useState<CanvasGradient | string>('rgba(255, 107, 53, 0.2)');
    
    useEffect(() => {
      const chart = chartRef.current;
      if (chart?.ctx && chart?.chartArea) {
        setGradient(createVerticalGradient(chart.ctx, chart.chartArea, 'rgba(255, 107, 53, 0.4)', 'rgba(255, 107, 53, 0)'));
      }
    }, []);
    
    return (
      <Line
        ref={chartRef}
        options={baseLineOptions}
        data={{
          labels: totalPaybackData.map(item => item.date),
          datasets: [{
            label: t('revenueCharts.cumulativeReturn'),
            data: totalPaybackData.map(item => item.cumulative),
            borderColor: '#FF6B35',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointRadius: 2,
            borderWidth: 2,
          }],
        }}
      />
    );
  };

  // If showOnly is specified, render only that chart
  if (showOnly === 'selfConsumption') {
    return <div className={className}><SelfConsumptionChart /></div>;
  }

  if (showOnly === 'feedIn') {
    return <div className={className}><FeedInChart /></div>;
  }

  if (showOnly === 'arbitrage') {
    return <div className={className}><ArbitrageChart /></div>;
  }

  if (showOnly === 'evCharging') {
    return <div className={className}><EVChargingChart /></div>;
  }

  if (showOnly === 'totalPayback') {
    return <div className={className}><TotalPaybackChart /></div>;
  }

  // Default: show all charts in grid (for backward compatibility)
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {/* 1. Self-Consumption Revenue */}
      <div className="bg-transparent rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 text-text">
          {t('revenueCharts.selfConsumption')}
        </h3>
        <div className="h-[200px]">
          <SelfConsumptionChart />
        </div>
      </div>

      {/* 2. Feed-in Revenue */}
      <div className="bg-transparent rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 text-text">
          {t('revenueCharts.feedIn')}
        </h3>
        <div className="h-[200px]">
          <FeedInChart />
        </div>
      </div>

      {/* 3. Arbitrage Revenue */}
      <div className="bg-transparent rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 text-text">
          {t('revenueCharts.arbitrage')}
        </h3>
        <div className="h-[200px]">
          <ArbitrageChart />
        </div>
      </div>

      {/* 4. EV Charging Revenue */}
      <div className="bg-transparent rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 text-text">
          {t('revenueCharts.evCharging')}
        </h3>
        <div className="h-[200px]">
          <EVChargingChart />
        </div>
      </div>

      {/* 5. Total Payback */}
      <div className="bg-transparent rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3 text-text">
          {t('revenueCharts.totalPayback')}
        </h3>
        <div className="h-[200px]">
          <TotalPaybackChart />
        </div>
      </div>
    </div>
  );
}

