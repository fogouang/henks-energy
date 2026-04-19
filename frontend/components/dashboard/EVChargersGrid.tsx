'use client';

/**
 * EV Chargers Grid Component
 * Displays 2 charging points per page with pagination
 */

import React, { useState } from 'react';
import { EVCharger } from './EVCharger';
import { useLanguage } from '@/contexts/LanguageContext';

interface EVChargerData {
  chargerNumber: number;
  isActive: boolean;
  batteryEnergy: number;
  gridEnergy: number;
  tariff: number;
  revenue: number;
  currentPower?: number;
}

interface EVChargersGridProps {
  chargers: EVChargerData[];
  className?: string;
}

const CHARGERS_PER_PAGE = 2;

export function EVChargersGrid({ chargers, className }: EVChargersGridProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const totalRevenue = chargers.reduce((sum, c) => sum + c.revenue, 0);
  const totalPages = Math.max(1, Math.ceil(chargers.length / CHARGERS_PER_PAGE));

  // Ensure currentPage stays in bounds if chargers change
  const safePage = Math.min(currentPage, totalPages - 1);
  const startIndex = safePage * CHARGERS_PER_PAGE;
  const pageChargers = chargers.slice(startIndex, startIndex + CHARGERS_PER_PAGE);

  // Build display slots: always show 2 (fill empty slots with placeholders)
  const displaySlots: (EVChargerData | null)[] = [
    pageChargers[0] ?? null,
    pageChargers[1] ?? null,
  ];

  return (
    <div className={`card p-6 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">{t('dashboard.evCharger')}</h3>
        {chargers.length > 0 && (
          <div className="text-sm">
            <span className="text-text-muted">{t('evCharger.totalRevenue')}: </span>
            <span className="font-bold text-success">€{totalRevenue.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 flex-1">
        {displaySlots.map((charger, index) =>
          charger ? (
            <EVCharger key={charger.chargerNumber} {...charger} />
          ) : (
            <div
              key={`empty-${index}`}
              className="card p-4 flex items-center justify-center border border-dashed border-border/60"
            >
              <p className="text-sm text-text-muted">{t('evCharger.noChargers')}</p>
            </div>
          )
        )}
      </div>

      {/* Pagination - only show when more than 2 chargers */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={() => setCurrentPage(Math.max(0, safePage - 1))}
            disabled={safePage === 0}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border/60"
            aria-label="Previous page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  safePage === i
                    ? 'bg-accent-1 w-5'
                    : 'bg-border hover:bg-text-muted'
                }`}
                aria-label={`Page ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, safePage + 1))}
            disabled={safePage === totalPages - 1}
            className="p-1.5 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-border/60"
            aria-label="Next page"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

