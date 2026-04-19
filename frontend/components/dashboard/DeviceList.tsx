'use client';

/**
 * Device List Component
 * Displays a grid/list of edge devices
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EdgeDevice } from '@/lib/api/client';

interface DeviceListProps {
  devices: Omit<EdgeDevice, 'token'>[];
  installations?: Array<{ id: number; name: string }>; // Optional installations map to show installation name
  onDeviceClick: (deviceId: number) => void;
  onEdit?: (deviceId: number) => void;
  onDelete?: (deviceId: number) => void;
  onActivate?: (installationId: number, deviceId: number) => void;
  onDeactivate?: (installationId: number, deviceId: number) => void;
  onToggleReverseSSH?: (installationId: number, deviceId: number, enabled: boolean) => void;
}

export function DeviceList({ devices, installations, onDeviceClick, onEdit, onDelete, onActivate, onDeactivate, onToggleReverseSSH }: DeviceListProps) {
  const { t } = useLanguage();

  const getInstallationName = (installationId: number) => {
    if (!installations) return installationId.toString();
    const installation = installations.find(inst => inst.id === installationId);
    return installation ? installation.name : installationId.toString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never') || 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">{t('devices.noDevices') || 'No devices found'}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {devices.map((device) => (
        <div
          key={device.id}
          className="card p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onDeviceClick(device.id)}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text">
                  {device.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-border text-text-muted">
                  {t('common.id')}: {device.id}
                </span>
              </div>
              {device.description && (
                <p className="text-sm mt-1 text-text-muted">
                  {device.description}
                </p>
              )}
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                device.is_active
                  ? 'bg-success/20 text-success border border-success/50'
                  : 'bg-surface border border-border text-text-muted'
              }`}
            >
              {device.is_active ? (t('devices.active') || 'Active') : (t('devices.inactive') || 'Inactive')}
            </div>
          </div>

          <div className="space-y-2 text-sm text-text-muted">
            <div>
              <span className="font-medium">{t('devices.installation') || 'Installation'}:</span>{' '}
              {getInstallationName(device.installation_id)}
            </div>
            <div>
              <span className="font-medium">{t('devices.lastSeen') || 'Last seen'}:</span>{' '}
              {formatDate(device.last_seen_at)}
            </div>
          </div>

          {/* Reverse SSH Toggle */}
          {device.reverse_ssh_enabled !== null && onToggleReverseSSH && (
            <div
              className="mt-3 flex items-center gap-2 pt-3 border-t border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-sm font-medium text-text">
                {t('devices.reverseSSH') || 'Reverse SSH'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleReverseSSH(device.installation_id, device.id, !device.reverse_ssh_enabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background ${
                  device.reverse_ssh_enabled
                    ? 'bg-success focus:ring-success'
                    : 'bg-border focus:ring-border'
                }`}
                role="switch"
                aria-checked={device.reverse_ssh_enabled}
                title={device.reverse_ssh_enabled ? (t('devices.disableSSH') || 'Disable Reverse SSH') : (t('devices.enableSSH') || 'Enable Reverse SSH')}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-text shadow transition-transform ${
                    device.reverse_ssh_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs ${device.reverse_ssh_enabled ? 'text-success' : 'text-text-muted'}`}>
                {device.reverse_ssh_enabled ? (t('common.enabled') || 'Enabled') : (t('common.disabled') || 'Disabled')}
              </span>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeviceClick(device.id);
              }}
              className="flex-1 px-4 py-2 rounded-md transition-colors text-sm font-medium bg-accent-1 text-text hover:bg-accent-1/90"
            >
              {t('devices.viewDashboard') || 'View Dashboard'}
            </button>
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(device.id);
                }}
                className="px-4 py-2 rounded-md transition-colors text-sm bg-surface border border-border text-text hover:bg-border"
              >
                {t('common.edit') || 'Edit'}
              </button>
            )}
            {device.is_active && onDeactivate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmed = window.confirm(t('devices.confirmDeactivate') || 'Are you sure you want to deactivate this device?');
                  if (confirmed) {
                    onDeactivate(device.installation_id, device.id);
                  }
                }}
                className="px-4 py-2 rounded-md transition-colors text-sm bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
              >
                {t('common.deactivate') || 'Deactivate'}
              </button>
            )}
            {!device.is_active && onActivate && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onActivate(device.installation_id, device.id);
                }}
                className="px-4 py-2 rounded-md transition-colors text-sm bg-success/20 border border-success/50 text-success hover:bg-success/30"
              >
                {t('common.activate') || 'Activate'}
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const confirmed = window.confirm(t('devices.confirmDelete') || 'Are you sure you want to delete this device?');
                  if (confirmed) {
                    onDelete(device.id);
                  }
                }}
                className="px-4 py-2 rounded-md transition-colors text-sm bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
              >
                {t('common.delete') || 'Delete'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

