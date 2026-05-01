'use client';

import React from 'react';

interface Session {
  station: number;
  started: string;
  minutes: number;
  kwh: number;
  price: number;
  is_active: boolean;
}

interface EVChargersGridProps {
  sessions: Session[];
  chargingPrice: number;
  className?: string;
}

export function EVChargersGrid({ sessions, chargingPrice, className }: EVChargersGridProps) {
  const totalRevenue = sessions.reduce((sum, s) => sum + s.price, 0);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className={`card p-4 h-full flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">EV Charger</h3>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span>€{chargingPrice.toFixed(2)}/kWh</span>
          <span className="font-bold text-green-400">Total: €{totalRevenue.toFixed(2)}</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {/* Header */}
        <div className="grid grid-cols-6 text-xs text-text-muted pb-1 border-b border-border">
          <span></span>
          <span className="col-span-2">started</span>
          <span>min</span>
          <span>kWh</span>
          <span>price</span>
        </div>

        {/* Sessions */}
        {sessions.length === 0 ? (
          <div className="text-xs text-text-muted text-center py-4">No sessions</div>
        ) : (
          sessions.map((s, i) => (
            <div key={i} className="grid grid-cols-6 text-xs items-center py-1 border-b border-border/30">
              <div className="flex items-center gap-1">
                <div style={{
                  width: 10, height: 10,
                  backgroundColor: s.is_active ? '#22c55e' : '#ef4444',
                  borderRadius: 2,
                  flexShrink: 0
                }}/>
                <span className="text-text-muted">{s.station}</span>
              </div>
              <span className="col-span-2 text-text">{formatDate(s.started)}</span>
              <span className="text-text">{s.minutes}</span>
              <span className="text-text">{s.kwh.toFixed(1)}</span>
              <span className="text-text">{s.price.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}