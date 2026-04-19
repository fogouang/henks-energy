'use client';

/**
 * Installation Detail Page (Admin)
 * Shows all devices for a specific installation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DeviceList } from '@/components/dashboard/DeviceList';
import { DeviceRegistration } from '@/components/dashboard/DeviceRegistration';
import { installationsApi, edgeDevicesApi, Installation, EdgeDevice, ApiClientError } from '@/lib/api/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Logo } from '@/components/common/Logo';
import { UserMenu } from '@/components/dashboard/UserMenu';

function InstallationDetailPage() {
  const { token, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const installationId = parseInt(params.installation_id as string, 10);

  const [installation, setInstallation] = useState<Installation | null>(null);
  const [devices, setDevices] = useState<Omit<EdgeDevice, 'token'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!token || !installationId) return;
    setLoading(true);
    setError(null);

    try {
      const [installationRes, devicesRes] = await Promise.all([
        installationsApi.getInstallation(installationId, token),
        edgeDevicesApi.getDevices(installationId, token),
      ]);

      setInstallation(installationRes);
      setDevices(devicesRes.devices);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('admin.loadError') || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [token, installationId, t]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!token || !user) {
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadData();
  }, [token, user, isLoading, router, loadData]);

  const handleDeviceCreate = async () => {
    await loadData();
  };

  const handleDeviceActivate = async (installationId: number, deviceId: number) => {
    if (!token) return;
    try {
      await edgeDevicesApi.activateDevice(installationId, deviceId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleDeviceDeactivate = async (installationId: number, deviceId: number) => {
    if (!token) return;
    try {
      await edgeDevicesApi.deactivateDevice(installationId, deviceId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleDeviceDelete = async (installationId: number, deviceId: number) => {
    if (!token) return;
    try {
      await edgeDevicesApi.deleteDevice(installationId, deviceId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleToggleReverseSSH = async (installationId: number, deviceId: number, enabled: boolean) => {
    if (!token) return;
    try {
      const updatedDevice = await edgeDevicesApi.toggleReverseSSH(installationId, deviceId, enabled, token);
      // Update device in list
      setDevices(devices.map(d => 
        d.id === deviceId 
          ? { ...d, reverse_ssh_enabled: updatedDevice.reverse_ssh_enabled }
          : d
      ));
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('devices.toggleSSHError') || 'Failed to toggle Reverse SSH');
      }
    }
  };

  if (isLoading || !token || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg" style={{ color: '#6b7280' }}>
            {t('common.loading') || 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'admin') {
    router.push('/');
    return null;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-surface shadow-sm border-b border-border">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Logo size="md" />
                <div>
                  <h1 className="text-2xl font-bold text-text">
                    {installation ? installation.name : 'Installation Details'}
                  </h1>
                  <button
                    onClick={() => {
                      // Go back to user detail page if we have owner_email, otherwise go to admin users
                      if (installation?.owner_email) {
                        // We need to find the user ID - for now, go to admin users
                        router.push('/admin/users');
                      } else {
                        router.push('/admin/users');
                      }
                    }}
                    className="text-sm mt-1"
                    style={{ color: '#6b7280' }}
                  >
                    ← {t('common.back') || 'Back'}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            {installation && (
              <p className="mt-2" style={{ color: '#6b7280' }}>
                {[installation.city, installation.state, installation.country].filter(Boolean).join(', ')} • {installation.owner_email ? `Owner: ${installation.owner_email}` : ''}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-md bg-critical/20 border border-critical/50 text-critical">
              {error}
            </div>
          )}

          <div className="mb-6">
            <div className="mb-4 flex justify-between items-center">
              <h2 className="text-xl font-semibold" style={{ color: '#1a2332' }}>
                {t('devices.myDevices') || 'Devices'} ({devices.length})
              </h2>
              {installation && (
                <button
                  onClick={() => setShowDeviceModal(true)}
                  className="px-4 py-2 rounded-md transition-colors font-medium"
                  style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#D85A1F';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F16D2B';
                  }}
                >
                  {t('devices.registerNew') || 'Register New Device'}
                </button>
              )}
            </div>
            {devices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{t('devices.noDevices') || 'No devices found'}</p>
              </div>
            ) : (
              <DeviceList
                devices={devices}
                installations={installation ? [{ id: installation.id, name: installation.name }] : []}
                onDeviceClick={(deviceId) => router.push(`/dashboard/${deviceId}`)}
                onDelete={(deviceId) => handleDeviceDelete(installationId, deviceId)}
                onActivate={(_, deviceId) => handleDeviceActivate(installationId, deviceId)}
                onDeactivate={(_, deviceId) => handleDeviceDeactivate(installationId, deviceId)}
                onToggleReverseSSH={handleToggleReverseSSH}
              />
            )}
          </div>
        </main>

        {showDeviceModal && installation && (
          <DeviceRegistration
            installationId={installation.id}
            onClose={() => setShowDeviceModal(false)}
            onSuccess={handleDeviceCreate}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}

export default InstallationDetailPage;

