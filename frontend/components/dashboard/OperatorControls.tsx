'use client';

/**
 * Operator Controls Component
 * Settings panel for system configuration
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface OperatorControlsProps {
  eveningReserve: number;
  onEveningReserveChange: (value: number) => void;
  generatorPriceThreshold: number;
  onGeneratorPriceThresholdChange: (value: number) => void;
  maxChargingCapacity: number;
  onMaxChargingCapacityChange: (value: number) => void;
  contractElectricityPrice: number;
  onContractElectricityPriceChange: (value: number) => void;
  className?: string;
}

export function OperatorControls({
  eveningReserve,
  onEveningReserveChange,
  generatorPriceThreshold,
  onGeneratorPriceThresholdChange,
  maxChargingCapacity,
  onMaxChargingCapacityChange,
  contractElectricityPrice,
  onContractElectricityPriceChange,
  className,
}: OperatorControlsProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`card ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left text-text"
      >
        <h3 className="text-lg font-semibold">{t('operator.title')}</h3>
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M5 7L10 12L15 7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Evening Reserve */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text">
              {t('operator.eveningReserve')}
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={eveningReserve}
              onChange={(e) => onEveningReserveChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text"
            />
            <p className="text-xs mt-1 text-text-muted">
              {t('operator.eveningReserveDesc')}
            </p>
          </div>

          {/* Generator Price Threshold */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              {t('operator.generatorThreshold')}
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={generatorPriceThreshold}
              onChange={(e) => onGeneratorPriceThresholdChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              style={{ borderColor: '#d1d5db' }}
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {t('operator.generatorThresholdDesc')}
            </p>
          </div>

          {/* Max Charging Capacity */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              {t('operator.maxChargingCapacity')}
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={maxChargingCapacity}
              onChange={(e) => onMaxChargingCapacityChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              style={{ borderColor: '#d1d5db' }}
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {t('operator.maxChargingCapacityDesc')}
            </p>
          </div>

          {/* Contract Electricity Price */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#374151' }}>
              {t('operator.contractPrice')}
            </label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={contractElectricityPrice}
              onChange={(e) => onContractElectricityPriceChange(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md"
              style={{ borderColor: '#d1d5db' }}
            />
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>
              {t('operator.contractPriceDesc')}
            </p>
          </div>

          {/* EPEX Prices Button */}
          <div>
            <button
              className="w-full px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#D85A1F';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F16D2B';
              }}
            >
              {t('operator.loadEpexPrices')}
            </button>
            <p className="text-xs mt-1 text-center" style={{ color: '#6b7280' }}>
              {t('operator.loadEpexPricesDesc')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

