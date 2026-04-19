'use client';

/**
 * EV Charger Component
 * Displays charging point status, energy from battery/grid, and revenue
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EVChargerProps {
  chargerNumber: number;
  isActive: boolean;
  batteryEnergy: number; // kWh from battery
  gridEnergy: number; // kWh from grid
  tariff: number; // €/kWh
  revenue: number; // €
  currentPower?: number; // kW
  className?: string;
}

export function EVCharger({
  chargerNumber,
  isActive,
  batteryEnergy,
  gridEnergy,
  tariff,
  revenue,
  currentPower,
  className,
}: EVChargerProps) {
  const { t } = useLanguage();
  const totalEnergy = batteryEnergy + gridEnergy;
  const batteryPercentage = totalEnergy > 0 ? (batteryEnergy / totalEnergy) * 100 : 0;
  const gridPercentage = totalEnergy > 0 ? (gridEnergy / totalEnergy) * 100 : 0;

  return (
    <div className={`card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-base font-semibold text-text">
          {t('evCharger.charger')} {chargerNumber}
        </h4>
        <span
          className={`px-2 py-1 rounded text-xs ${
            isActive ? 'bg-success text-text' : 'bg-inactive text-text'
          }`}
        >
          {isActive ? t('evCharger.active') : t('evCharger.idle')}
        </span>
      </div>

      {currentPower !== undefined && (
        <div className="mb-3">
          <div className="text-xs mb-1 text-text-muted">{t('evCharger.currentPower')}</div>
          <div className="text-lg font-bold text-text">
            {currentPower.toFixed(2)} kW
          </div>
        </div>
      )}

      {/* Energy Sources */}
      <div className="mb-3">
        <div className="text-xs mb-2 text-text-muted">{t('evCharger.energySources')}</div>
        <div className="flex gap-1 h-4 rounded overflow-hidden">
          {batteryPercentage > 0 && (
            <div
              className="h-full"
              style={{
                width: `${batteryPercentage}%`,
                backgroundColor: '#8b5cf6',
              }}
              title={`${batteryEnergy.toFixed(2)} kWh from battery`}
            />
          )}
          {gridPercentage > 0 && (
            <div
              className="h-full"
              style={{
                width: `${gridPercentage}%`,
                backgroundColor: '#06b6d4',
              }}
              title={`${gridEnergy.toFixed(2)} kWh from grid`}
            />
          )}
        </div>
        <div className="flex justify-between text-xs mt-1 text-text-muted">
          <span>
            {t('evCharger.battery')}: {batteryEnergy.toFixed(2)} kWh
          </span>
          <span>
            {t('evCharger.grid')}: {gridEnergy.toFixed(2)} kWh
          </span>
        </div>
      </div>

      {/* Revenue */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-muted">{t('evCharger.revenue')}</span>
          <span className="text-base font-bold text-success">
            €{revenue.toFixed(2)}
          </span>
        </div>
        <div className="text-xs mt-1 text-text-muted">
          {t('evCharger.tariff')}: €{tariff.toFixed(3)}/kWh
        </div>
      </div>
    </div>
  );
}

