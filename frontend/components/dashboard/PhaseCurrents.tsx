'use client';
 
 /**
  * Phase Currents Card (L1, L2, L3)
  */
 
 import React, { useRef, useEffect, useState } from 'react';
 import {
   Chart as ChartJS,
   CategoryScale,
   LinearScale,
   BarElement,
   Tooltip,
   Legend,
 } from 'chart.js';
 import { Bar } from 'react-chartjs-2';
 import { useLanguage } from '@/contexts/LanguageContext';
 
 ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);
 
 interface PhaseCurrentsProps {
   l1Current?: number;
   l2Current?: number;
   l3Current?: number;
   className?: string;
 }
 
 const MAX_CURRENT_A = 3;

 // Create gradient for bar charts
 function createGradient(ctx: CanvasRenderingContext2D, colorStart: string, colorEnd: string, width: number) {
   const gradient = ctx.createLinearGradient(0, 0, width, 0);
   gradient.addColorStop(0, colorStart);
   gradient.addColorStop(1, colorEnd);
   return gradient;
 }
 
 export function PhaseCurrents({
   l1Current,
   l2Current,
   l3Current,
   className,
 }: PhaseCurrentsProps) {
   const { t } = useLanguage();
   const chartRef = useRef<ChartJS<'bar'>>(null);
   const [gradients, setGradients] = useState<(CanvasGradient | string)[]>(['#00CED1', '#f59e0b', '#8b5cf6']);
   
   const phaseValues = [l1Current, l2Current, l3Current];
   const normalizedPhaseValues = phaseValues.map(value =>
     typeof value === 'number' ? Math.max(0, value) : 0
   );
   const phaseDisplayValues = phaseValues.map(value =>
     typeof value === 'number' ? `${value.toFixed(1)} A` : '--'
   );

   useEffect(() => {
     const chart = chartRef.current;
     if (chart) {
       const ctx = chart.ctx;
       const chartArea = chart.chartArea;
       if (ctx && chartArea) {
         const width = chartArea.right - chartArea.left;
         setGradients([
           createGradient(ctx, '#0891b2', '#00CED1', width),
           createGradient(ctx, '#d97706', '#fbbf24', width),
           createGradient(ctx, '#7c3aed', '#a78bfa', width),
         ]);
       }
     }
   }, []);

   const phaseValuePlugin = {
     id: 'phaseValuePlugin',
     afterDatasetsDraw: (chart: ChartJS) => {
       const { ctx } = chart;
       const meta = chart.getDatasetMeta(0);
       if (!meta?.data?.length) {
         return;
       }
       ctx.save();
       ctx.font = '12px sans-serif';
       ctx.fillStyle = '#9ca3af';
       ctx.textBaseline = 'middle';
       meta.data.forEach((bar: any, index: number) => {
         const label = phaseDisplayValues[index];
         if (!label) return;
         const x = bar.x + 8;
         const y = bar.y;
         ctx.fillText(label, x, y);
       });
       ctx.restore();
     },
   };

  return (
    <div className={`card p-4 flex flex-col h-full ${className}`}>
      <div className="text-xs uppercase mb-3 text-text-muted">{t('meter.phaseCurrents')}</div>
      <div className="flex-1 min-h-0">
         <Bar
           ref={chartRef}
           data={{
             labels: ['L1', 'L2', 'L3'],
             datasets: [
               {
                 data: normalizedPhaseValues,
                 backgroundColor: gradients,
                 borderRadius: 4,
                 barThickness: 12,
               },
             ],
           }}
           options={{
             responsive: true,
             maintainAspectRatio: false,
             indexAxis: 'y',
             plugins: {
               legend: { display: false },
               tooltip: { enabled: false },
             },
             scales: {
               x: {
                 beginAtZero: true,
                 max: MAX_CURRENT_A,
                 ticks: { color: '#9ca3af', stepSize: 0.1 },
                 grid: { color: 'rgba(148, 163, 184, 0.2)' },
               },
               y: {
                 ticks: { color: '#9ca3af' },
                 grid: { display: false },
               },
             },
           }}
           plugins={[phaseValuePlugin]}
         />
       </div>
     </div>
   );
 }
