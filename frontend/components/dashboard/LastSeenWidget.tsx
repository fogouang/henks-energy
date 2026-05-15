'use client';

import React, { useState, useEffect } from 'react';
import { edgeDevicesApi } from '@/lib/api/client';

interface Device {
  id: number;
  name: string;
  last_seen_at: string | null;
}

interface LastSeenWidgetProps {
  installationId: number | null;
  token: string | null;
  className?: string;
}

export function LastSeenWidget({ installationId, token, className }: LastSeenWidgetProps) {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    if (!installationId || !token) return;
    const fetch = async () => {
      try {
        const res = await edgeDevicesApi.getDevices(installationId, token);
        setDevices(res.devices || []);
      } catch (err) {
        console.error('Failed to load devices:', err);
      }
    };
    fetch();
  }, [installationId, token]);

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Never';
    const d = new Date(iso);
    return d.toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  return (
    <div className={`card p-4 h-full flex flex-col ${className}`}>
      <div className="text-xs font-semibold uppercase text-text-muted mb-3">
        Last seen
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto">
        {devices.length === 0 ? (
          <div className="text-xs text-text-muted">No devices</div>
        ) : (
          devices.map(d => (
            <div key={d.id}>
              <div className="text-sm font-semibold text-text">{d.id} {d.name}</div>
              <div className="text-xs text-text-muted">{formatDate(d.last_seen_at)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}