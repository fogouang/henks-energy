'use client';

import React from 'react';
import { EVCharger } from './EVCharger';

interface Session {
  started: string;
  minutes: number;
  kwh: number;
  price: number;
  is_active: boolean;
}

interface ChargerData {
  charger_number: number;
  charger_id: number;
  charging_price: number;
  sessions: Session[];
}

interface EVChargersGridProps {
  chargers: ChargerData[];
  className?: string;
}

export function EVChargersGrid({ chargers, className }: EVChargersGridProps) {
  const totalRevenue = chargers.flatMap(c => c.sessions).reduce((sum, s) => sum + s.price, 0);

  return (
    <div className={`card p-6 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">EV Charger</h3>
        <span className="text-sm font-bold text-green-400">
          Total: €{totalRevenue.toFixed(2)}
        </span>
      </div>

      <div className="space-y-3 flex-1 overflow-y-auto">
        {chargers.length === 0 ? (
          <div className="text-sm text-text-muted text-center py-4">No charging points configured</div>
        ) : (
          chargers.map(c => (
            <EVCharger
              key={c.charger_id}
              chargerNumber={c.charger_number}
              chargingPrice={c.charging_price}
              sessions={c.sessions}
            />
          ))
        )}
      </div>
    </div>
  );
}