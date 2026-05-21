'use client';

import React, { useMemo } from 'react';
import { Installation, EdgeDevice } from '@/lib/api/client';

interface InstallationDevicesViewProps {
  installations: Installation[];
  devices: Omit<EdgeDevice, 'token'>[];
  onDeviceClick: (deviceId: number) => void;
  onDeviceDelete?: (deviceId: number) => void;
  onInstallationClick?: (installationId: number) => void;
  onRegisterDevice?: (installationId: number) => void;
  onEditInstallation?: (installation: Installation) => void;
  onToggleReverseSSH?: (installationId: number, deviceId: number, enabled: boolean) => void;
}

export function InstallationDevicesView({
  installations,
  devices,
  onDeviceClick,
  onDeviceDelete,
  onInstallationClick,
  onRegisterDevice,
  onEditInstallation,
  onToggleReverseSSH,
}: InstallationDevicesViewProps) {

  const devicesByInstallation = useMemo(() => {
    return devices.reduce((acc, device) => {
      if (!acc[device.installation_id]) acc[device.installation_id] = [];
      acc[device.installation_id].push(device);
      return acc;
    }, {} as Record<number, Omit<EdgeDevice, 'token'>[]>);
  }, [devices]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('nl-NL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatLocation = (inst: Installation) => {
    const parts = [inst.city];
    if (inst.state) parts.push(inst.state);
    parts.push(inst.country);
    return parts.join(', ');
  };

  const getLastSeen = (installationId: number) => {
    const devs = devicesByInstallation[installationId] || [];
    if (devs.length === 0) return null;
    const dates = devs
      .map(d => d.last_seen_at ? new Date(d.last_seen_at).getTime() : 0)
      .filter(d => d > 0);
    if (dates.length === 0) return null;
    return new Date(Math.min(...dates)).toISOString();
  };

  const isActiveDevice = (lastSeen: string | null) => {
    if (!lastSeen) return false;
    return (Date.now() - new Date(lastSeen).getTime()) < 3600000;
  };

  if (installations.length === 0) {
    return <div className="text-center py-8 text-text-muted text-sm">No installations found</div>;
  }

  return (
    <div className="card overflow-hidden">
      {/* Installations table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface">
            <th className="px-3 py-2 text-left text-text-muted font-medium text-sm">ID</th>
            <th className="px-3 py-2 text-left text-text-muted font-medium text-sm">Name</th>
            <th className="px-3 py-2 text-left text-text-muted font-medium text-sm">Location</th>
            <th className="px-3 py-2 text-left text-text-muted font-medium text-sm">Last seen</th>
            <th className="px-3 py-2 text-left text-text-muted font-medium text-sm">Actions</th>
          </tr>
        </thead>
        <tbody>
          {installations.map((inst) => {
            const lastSeen = getLastSeen(inst.id);
            const installationDevices = devicesByInstallation[inst.id] || [];

            return (
              <React.Fragment key={inst.id}>
                {/* Installation row */}
                <tr className="border-b border-border/50 hover:bg-border/20 bg-surface/30">
                  <td className="px-3 py-1.5 text-text-muted font-mono text-sm">{inst.id}</td>
                  <td className="px-3 py-1.5 font-medium text-text text-sm">{inst.name}</td>
                  <td className="px-3 py-1.5 text-text-muted text-sm">{formatLocation(inst)}</td>
                  <td className="px-3 py-1.5 text-text-muted text-sm">{formatDate(lastSeen)}</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onDeviceClick(installationDevices[0]?.id)}
                        className="text-accent-1 hover:underline"
                        disabled={installationDevices.length === 0}
                      >
                        Dashboard
                      </button>
                      {onEditInstallation && (
                        <button
                          onClick={() => onEditInstallation(inst)}
                          className="text-text-muted hover:text-text hover:underline"
                        >
                  
                  
                  \                                                Edit
                        </button>
                      )}
                      {onRegisterDevice && (
                        <button
                          onClick={() => onRegisterDevice(inst.id)}
                          className="text-text-muted hover:text-text hover:underline"
                        >
                          + Device
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Device rows */}
                {installationDevices.map((device) => {
                  const active = isActiveDevice(device.last_seen_at);
                  return (
                    <tr key={device.id} className="border-b border-border/30 hover:bg-border/10">
                      <td className="px-3 py-1 pl-8 text-text-muted font-mono">{device.id}</td>
                      <td className="px-3 py-1" colSpan={1}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: active ? '#10b981' : '#ef4444' }}
                          />
                          <span className="text-text">{device.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1 text-text-muted" colSpan={1}>
                        {formatDate(device.last_seen_at)}
                      </td>
                      <td className="px-3 py-1" colSpan={2}>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onDeviceClick(device.id)}
                            className="text-accent-1 hover:underline"
                          >
                            Dashboard
                          </button>
                          {onToggleReverseSSH && (
                            <button
                              onClick={() => onToggleReverseSSH(device.installation_id, device.id, !device.reverse_ssh_enabled)}
                              className={`hover:underline ${device.reverse_ssh_enabled ? 'text-green-400' : 'text-text-muted'}`}
                            >
                              SSH {device.reverse_ssh_enabled ? 'ON' : 'OFF'}
                            </button>
                          )}
                          {onDeviceDelete && (
                            <button
                              onClick={() => {
                                if (confirm('Delete this device?')) onDeviceDelete(device.id);
                              }}
                              className="text-red-400 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}