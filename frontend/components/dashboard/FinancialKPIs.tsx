'use client';

/**
 * Financial KPIs Component
 * Displays key financial metrics
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface FinancialKPIsProps {
  savings: {
    day: number;
    week: number;
    month: number;
  };
  evChargingMargins: number;
  arbitrageScore: number;
  autonomyPercentage: number;
  timeToPayback?: string;
  className?: string;
}

export function FinancialKPIs({
  savings,
  evChargingMargins,
  arbitrageScore,
  autonomyPercentage,
  timeToPayback,
  className,
}: FinancialKPIsProps) {
  const { t } = useLanguage();
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* Savings */}
      <div className="card p-4">
        <h4 className="text-sm font-medium mb-2 text-text-muted">{t('financial.savings')}</h4>
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">{t('financial.today')}</span>
            <span className="font-bold text-success">€{savings.day.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">{t('financial.thisWeek')}</span>
            <span className="font-bold text-success">€{savings.week.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-text-muted">{t('financial.thisMonth')}</span>
            <span className="font-bold text-success">€{savings.month.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* EV Charging Margins */}
      <div className="card p-4">
        <h4 className="text-sm font-medium mb-2 text-text-muted">{t('financial.evChargingMargins')}</h4>
        <div className="text-2xl font-bold text-accent-2">
          €{evChargingMargins.toFixed(2)}
        </div>
        <div className="text-xs mt-1 text-text-muted">{t('financial.totalMarginVsGrid')}</div>
      </div>

      {/* Arbitrage Score */}
      <div className="card p-4">
        <h4 className="text-sm font-medium mb-2 text-text-muted">{t('financial.arbitrageScore')}</h4>
        <div className="text-2xl font-bold text-accent-2">
          {arbitrageScore.toFixed(1)}%
        </div>
        <div className="text-xs mt-1 text-text-muted">{t('financial.efficiencyRating')}</div>
      </div>

      {/* Autonomy */}
      <div className="card p-4">
        <h4 className="text-sm font-medium mb-2 text-text-muted">{t('financial.autonomy')}</h4>
        <div className="text-2xl font-bold text-success">
          {autonomyPercentage.toFixed(1)}%
        </div>
        <div className="text-xs mt-1 text-text-muted">{t('financial.selfSufficiency')}</div>
      </div>

      {/* Time to Payback Badge */}
      {timeToPayback && (
        <div className="card p-4 col-span-full">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium mb-1 text-text-muted">{t('financial.timeToPayback')}</h4>
              <div className="text-lg font-bold text-accent-1">
                {timeToPayback}
              </div>
            </div>
            <div className="px-4 py-2 rounded bg-accent-1/20 border border-accent-1/50">
              <span className="text-xs font-medium text-accent-1">{t('financial.roiTracker')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

