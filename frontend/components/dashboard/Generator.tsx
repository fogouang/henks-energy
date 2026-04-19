'use client';

/**
 * Generator Component
 * Displays generator status, fuel consumption, and charging power
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface GeneratorProps {
  status: 'on' | 'off' | 'starting' | 'error';
  fuelConsumption: number; // l/h
  chargingPower: number; // kW
  fuelCost: number; // €/l
  autoStartReason?: string; // Why generator started automatically
  className?: string;
}

export function Generator({
  status,
  fuelConsumption,
  chargingPower,
  fuelCost,
  autoStartReason,
  className,
}: GeneratorProps) {
  const { t } = useLanguage();
  const getStatusColor = () => {
    switch (status) {
      case 'on':
        return { bg: '#10b981', text: '#ffffff' };
      case 'starting':
        return { bg: '#f59e0b', text: '#ffffff' };
      case 'error':
        return { bg: '#ef4444', text: '#ffffff' };
      default:
        return { bg: '#6b7280', text: '#ffffff' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'on':
        return t('generator.running');
      case 'starting':
        return t('generator.starting');
      case 'error':
        return t('generator.error');
      default:
        return t('generator.off');
    }
  };

  const hourlyCost = (fuelConsumption * fuelCost).toFixed(2);

  return (
    <div className={`card p-6 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">{t('generator.title')}</h3>
        <span
          className="px-3 py-1 rounded text-xs font-medium"
          style={{
            backgroundColor: getStatusColor().bg,
            color: getStatusColor().text,
          }}
        >
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Fuel Icon and Consumption */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-accent-1/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M3 13H21L19 21H5L3 13ZM3 13L5 7H19L21 13"
                stroke="#F16D2B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-sm text-text-muted">{t('generator.fuelConsumption')}</div>
            <div className="text-xl font-bold text-text">
              {fuelConsumption.toFixed(2)} l/h
            </div>
          </div>
        </div>

        {/* Charging Power */}
        <div>
          <div className="text-sm mb-1 text-text-muted">{t('generator.chargingPower')}</div>
          <div className="text-2xl font-bold" style={{ color: '#10b981' }}>
            {chargingPower.toFixed(2)} kW
          </div>
        </div>

        {/* Cost Indicator */}
        <div className="pt-3 border-t" style={{ borderColor: '#f3f4f6' }}>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: '#6b7280' }}>{t('generator.hourlyCost')}</span>
            <span className="text-lg font-semibold" style={{ color: '#374151' }}>
              €{hourlyCost}/h
            </span>
          </div>
        </div>

        {/* Auto-start reason */}
        {autoStartReason && status === 'on' && (
          <div className="pt-2">
            <div className="text-xs p-2 rounded bg-warning/20 border border-warning/50 text-warning">
              <span className="font-medium">{t('generator.autoStarted')}</span> {autoStartReason}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

