'use client';

/**
 * Inverter Card Component
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface InverterCardProps {
  inverterNumber: number;
  power: number; // kW
  ratedPower: number; // kW
  curtailment: number; // 0-100%
  status: 'active' | 'dimmed' | 'disabled' | 'error';
  curtailmentReason?: string; // Why curtailment is happening
  className?: string;
}

export function InverterCard({
  inverterNumber,
  power,
  ratedPower,
  curtailment,
  status,
  curtailmentReason,
  className,
}: InverterCardProps) {
  const { t } = useLanguage();
  const utilization = (power / ratedPower) * 100;
  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return { bg: '#10b981', text: '#ffffff' };
      case 'dimmed':
        return { bg: '#f59e0b', text: '#ffffff' };
      case 'disabled':
        return { bg: '#6b7280', text: '#ffffff' };
      case 'error':
        return { bg: '#ef4444', text: '#ffffff' };
      default:
        return { bg: '#6b7280', text: '#ffffff' };
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'active':
        return t('inverter.active');
      case 'dimmed':
        return t('inverter.dimmed');
      case 'disabled':
        return t('inverter.disabled');
      case 'error':
        return t('inverter.error');
      default:
        return t('inverter.unknown');
    }
  };

  return (
    <div className={`card p-6 h-full ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Inverter {inverterNumber}</h3>
        <span 
          className="px-2 py-1 rounded text-xs"
          style={{ 
            backgroundColor: getStatusColor().bg,
            color: getStatusColor().text
          }}
        >
          {getStatusText()}
        </span>
      </div>

      <div className="space-y-4">
        {/* Power */}
        <div>
            <div className="flex justify-between text-sm mb-1 text-text-muted">
              <span>{t('inverter.power')}</span>
            <span>{power.toFixed(2)} / {ratedPower.toFixed(1)} kW</span>
          </div>
          <div className="w-full rounded-full h-2 bg-border">
            <div
              className="h-2 rounded-full transition-all bg-accent-1"
              style={{ 
                width: `${Math.min(utilization, 100)}%`
              }}
            />
          </div>
        </div>

        {/* Curtailment */}
        {curtailment > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1 text-text-muted">
              <span>{t('inverter.curtailment')}</span>
              <span>{curtailment.toFixed(1)}%</span>
            </div>
            <div className="w-full rounded-full h-2 bg-border">
              <div
                className="h-2 rounded-full transition-all"
                style={{ 
                  width: `${curtailment}%`,
                  backgroundColor: '#f59e0b'
                }}
              />
            </div>
            {curtailmentReason && (
              <div className="mt-1 text-xs text-warning">
                {curtailmentReason}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

