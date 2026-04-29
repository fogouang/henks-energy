"use client";

import React from "react";

interface Session {
  started: string;
  minutes: number;
  kwh: number;
  price: number;
  is_active: boolean;
}

interface EVChargerProps {
  chargerNumber: number;
  chargingPrice: number;
  sessions: Session[];
  className?: string;
}

export function EVCharger({
  chargerNumber,
  chargingPrice,
  sessions,
  className,
}: EVChargerProps) {
  const activeSession = sessions.find((s) => s.is_active);
  const pastSessions = sessions.filter((s) => !s.is_active);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("nl-NL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className={`card p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-text">
          Station {chargerNumber}
        </h4>
        <span className="text-xs text-text-muted">
          €{chargingPrice.toFixed(3)}/kWh
        </span>
      </div>

      {/* Sessions list */}
      <div className="overflow-y-auto max-h-[250px] space-y-1">
        {/* Header */}
        <div className="grid grid-cols-5 text-xs text-text-muted pb-1 border-b border-border">
          <span className="col-span-2">started</span>
          <span>min</span>
          <span>kWh</span>
          <span>price</span>
        </div>

        {/* Active session */}
        {activeSession && (
          <div className="grid grid-cols-5 text-xs items-center py-1">
            <div
              className="w-3 h-3 rounded-sm bg-green-500 mr-1 col-span-1 flex-shrink-0"
              style={{
                width: 12,
                height: 12,
                backgroundColor: "#22c55e",
                borderRadius: 2,
              }}
            />
            <span className="text-text col-span-1">
              {formatDate(activeSession.started)}
            </span>
            <span className="text-text">{activeSession.minutes}</span>
            <span className="text-text">{activeSession.kwh.toFixed(1)}</span>
            <span className="text-text">{activeSession.price.toFixed(2)}</span>
          </div>
        )}

        {/* Past sessions */}
        {pastSessions.map((s, i) => (
          <div key={i} className="grid grid-cols-5 text-xs items-center py-1">
            <div
              style={{
                width: 12,
                height: 12,
                backgroundColor: "#ef4444",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <span className="text-text">{formatDate(s.started)}</span>
            <span className="text-text">{s.minutes}</span>
            <span className="text-text">{s.kwh.toFixed(1)}</span>
            <span className="text-text">{s.price.toFixed(2)}</span>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-xs text-text-muted text-center py-4">
            No sessions
          </div>
        )}
      </div>
    </div>
  );
}
