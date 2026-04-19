'use client';

/**
 * Installation Devices View Component
 * Shows installations with their devices nested underneath in a nice list format
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { t } = useLanguage();
  const [expandedInstallations, setExpandedInstallations] = useState<Set<number>>(new Set());

  const formatLocation = (installation: Installation) => {
    const parts = [installation.city];
    if (installation.state) {
      parts.push(installation.state);
    }
    parts.push(installation.country);
    return parts.join(', ');
  };

  // Group devices by installation_id
  const devicesByInstallation = useMemo(() => {
    return devices.reduce((acc, device) => {
      if (!acc[device.installation_id]) {
        acc[device.installation_id] = [];
      }
      acc[device.installation_id].push(device);
      return acc;
    }, {} as Record<number, Omit<EdgeDevice, 'token'>[]>);
  }, [devices]);

  // Expand installations with devices by default
  useEffect(() => {
    const installationsWithDevices = installations
      .filter(inst => (devicesByInstallation[inst.id] || []).length > 0)
      .map(inst => inst.id);
    
    setExpandedInstallations(new Set(installationsWithDevices));
  }, [installations, devicesByInstallation]);

  const toggleInstallation = (installationId: number) => {
    const newExpanded = new Set(expandedInstallations);
    if (newExpanded.has(installationId)) {
      newExpanded.delete(installationId);
    } else {
      newExpanded.add(installationId);
    }
    setExpandedInstallations(newExpanded);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never') || 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getComponents = (installation: Installation) => {
    const components = [
      installation.has_pv && t('installations.componentPv'),
      installation.has_battery && t('installations.componentBattery'),
      installation.has_generator && t('installations.componentGenerator'),
      installation.has_ev_chargers && t('installations.componentEvChargers'),
    ].filter(Boolean).join(', ');
    return components || t('common.empty');
  };

  if (installations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">{t('installations.noInstallations') || 'No installations found'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {installations.map((installation) => {
        const installationDevices = devicesByInstallation[installation.id] || [];
        const isExpanded = expandedInstallations.has(installation.id);
        const hasDevices = installationDevices.length > 0;

        return (
          <div
            key={installation.id}
            className="card overflow-hidden"
          >
            {/* Installation Header */}
            <div className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 cursor-pointer hover:bg-border -m-2 p-2 rounded transition-colors"
                  onClick={() => {
                    if (hasDevices) {
                      toggleInstallation(installation.id);
                    } else if (onInstallationClick) {
                      onInstallationClick(installation.id);
                    }
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-text">
                      {installation.name}
                    </h3>
                    {hasDevices && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-accent-2/20 text-accent-2 border border-accent-2/50">
                        {installationDevices.length} {installationDevices.length === 1 ? (t('devices.device') || 'device') : (t('devices.devices') || 'devices')}
                      </span>
                    )}
                    {!hasDevices && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-border text-text-muted">
                        {t('installations.noDevices') || 'No devices'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-text-muted">
                    <div>
                      <span className="font-medium">{t('installations.location') || 'Location'}:</span>{' '}
                      {formatLocation(installation)}
                    </div>
                    <div>
                      <span className="font-medium">{t('installations.components') || 'Components'}:</span>{' '}
                      {getComponents(installation)}
                    </div>
                    <div>
                      <span className="font-medium">{t('installations.inverters') || 'Inverters'}:</span>{' '}
                      {installation.inverter_count}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onEditInstallation && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditInstallation(installation);
                      }}
                      className="px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap bg-border text-text hover:bg-border/80"
                    >
                      {t('common.edit') || 'Edit'}
                    </button>
                  )}
                  {onRegisterDevice && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRegisterDevice(installation.id);
                      }}
                      className="px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap bg-accent-1 text-text hover:bg-accent-1/90"
                    >
                      + {t('devices.registerNew') || 'Register Device'}
                    </button>
                  )}
                  {hasDevices && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleInstallation(installation.id);
                      }}
                      className="p-2 rounded-md transition-colors hover:bg-border text-text-muted"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Devices List (Nested) */}
            {hasDevices && isExpanded && (
              <div className="border-t border-border bg-background">
                <div className="p-4">
                  <div className="space-y-2">
                    {installationDevices.map((device) => (
                      <div
                        key={device.id}
                        className="card p-3 hover:shadow-lg transition-all cursor-pointer"
                        onClick={(e) => {
                          // Make entire card clickable
                          if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                            onDeviceClick(device.id);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-base font-semibold truncate text-text">
                                {device.name}
                              </h4>
                              <span className="px-1.5 py-0.5 rounded text-xs font-mono flex-shrink-0 bg-border text-text-muted">
                                {t('common.id')}: {device.id}
                              </span>
                              <div
                                className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                                  device.is_active
                                    ? 'bg-success/20 text-success border border-success/50'
                                    : 'bg-surface border border-border text-text-muted'
                                }`}
                              >
                                {device.is_active ? (t('devices.active') || 'Active') : (t('devices.inactive') || 'Inactive')}
                              </div>
                            </div>
                            {device.description && (
                              <p className="text-xs mb-1 truncate text-text-muted">
                                {device.description}
                              </p>
                            )}
                            <div className="text-xs text-text-muted">
                              <span className="font-medium">{t('devices.lastSeen') || 'Last seen'}:</span>{' '}
                              {formatDate(device.last_seen_at)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Reverse SSH Toggle */}
                            {device.reverse_ssh_enabled !== null && onToggleReverseSSH && (
                              <div
                                className="flex items-center gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-xs font-medium text-text-muted">
                                  {t('devices.ssh')}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleReverseSSH(device.installation_id, device.id, !device.reverse_ssh_enabled);
                                  }}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background ${
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
                                      device.reverse_ssh_enabled ? 'translate-x-4' : 'translate-x-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeviceClick(device.id);
                              }}
                              className="px-3 py-1.5 rounded-md transition-colors text-xs font-medium whitespace-nowrap"
                              style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#D85A1F';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F16D2B';
                              }}
                            >
                              {t('devices.viewDashboard') || 'View'}
                            </button>
                            {onDeviceDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const confirmed = window.confirm(
                                    t('devices.confirmDelete') || 'Are you sure you want to delete this device?'
                                  );
                                  if (confirmed) {
                                    onDeviceDelete(device.id);
                                  }
                                }}
                                className="px-2 py-1.5 rounded-md transition-colors text-xs bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
                                title={t('common.delete') || 'Delete'}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

