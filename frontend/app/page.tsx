'use client';

/**
 * Landing Page
 * Role-based view:
 * - Admin: Shows admin dashboard link + device list
 * - User: Shows their installations and devices
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InstallationDevicesView } from '@/components/dashboard/InstallationDevicesView';
import { InstallationRegistration } from '@/components/dashboard/InstallationRegistration';
import { DeviceRegistration } from '@/components/dashboard/DeviceRegistration';
import { Logo } from '@/components/common/Logo';
import { UserMenu } from '@/components/dashboard/UserMenu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { edgeDevicesApi, installationsApi, EdgeDevice, Installation, ApiClientError } from '@/lib/api/client';

function LandingPageContent() {
  const { t } = useLanguage();
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Omit<EdgeDevice, 'token'>[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [showInstallationRegistration, setShowInstallationRegistration] = useState(false);
  const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);
  const [deviceRegistrationInstallationId, setDeviceRegistrationInstallationId] = useState<number | null>(null);
  const isAdmin = user?.role === 'admin';

  // Load data based on user role
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        // Get installations (admin sees all, user sees only their own)
        const installationsResponse = await installationsApi.getInstallations(token);
        const userInstallations = installationsResponse.installations || [];
        setInstallations(userInstallations);

        // Get devices from user's installations
        const allDevices: Omit<EdgeDevice, 'token'>[] = [];
        for (const installation of userInstallations) {
          try {
            const devicesResponse = await edgeDevicesApi.getDevices(installation.id, token);
            allDevices.push(...devicesResponse.devices);
          } catch (err) {
            console.error(`Failed to load devices for installation ${installation.id}:`, err);
          }
        }

        setDevices(allDevices);
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.detail);
        } else {
          setError(t('devices.loadError') || 'Failed to load data');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, t, isAdmin, router]);

  const handleDeviceClick = (deviceId: number) => {
    router.push(`/dashboard/${deviceId}`);
  };

  const handleDeviceRegistered = async () => {
    // Reload data
    if (!token) return;
    try {
      const installationsResponse = await installationsApi.getInstallations(token);
      const userInstallations = installationsResponse.installations || [];
      setInstallations(userInstallations);

      const allDevices: Omit<EdgeDevice, 'token'>[] = [];
      for (const installation of userInstallations) {
        try {
          const devicesResponse = await edgeDevicesApi.getDevices(installation.id, token);
          allDevices.push(...devicesResponse.devices);
        } catch (err) {
          console.error(`Failed to load devices for installation ${installation.id}:`, err);
        }
      }
      setDevices(allDevices);
    } catch (err) {
      console.error('Failed to reload data:', err);
    }
  };

  const handleInstallationRegistered = async () => {
    await handleDeviceRegistered();
  };

  const handleDelete = async (deviceId: number) => {
    if (!token) return;

    // Find device to get installation_id
    const device = devices.find(d => d.id === deviceId);
    if (!device) return;

    try {
      await edgeDevicesApi.deleteDevice(device.installation_id, deviceId, token);
      // Remove from list
      setDevices(devices.filter(d => d.id !== deviceId));
    } catch (err) {
      if (err instanceof ApiClientError) {
        alert(err.detail);
      } else {
        alert(t('devices.deleteError') || 'Failed to delete device');
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
        alert(err.detail);
      } else {
        alert(t('devices.toggleSSHError') || 'Failed to toggle Reverse SSH');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg text-text-muted">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="text-lg mb-2 text-critical">{t('common.error')}</div>
          <div className="text-sm mb-4 text-text-muted">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-md transition-colors bg-accent-1 text-text hover:bg-accent-1/90"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-border">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Logo size="md" />
              <h1 className="text-2xl font-bold text-text">
                {isAdmin ? (t('admin.dashboard') || 'Admin Dashboard') : (t('dashboard.title') || 'My Dashboard')}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-text hover:bg-accent-1/90"
                >
                  {t('admin.adminPanel') || 'Admin Panel'}
                </button>
              )}
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Installations with Devices (Nested View) */}
        <div>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-text">
              {t('installations.myInstallations') || 'My Installations'}
            </h2>
            {!isAdmin && (
              <button
                onClick={() => setShowInstallationRegistration(true)}
                className="px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-text hover:bg-accent-1/90"
              >
                {t('installations.createInstallation') || '+ Create Installation'}
              </button>
            )}
          </div>
          <InstallationDevicesView
            installations={installations}
            devices={devices}
            onDeviceClick={handleDeviceClick}
            onDeviceDelete={handleDelete}
            onRegisterDevice={
              !isAdmin
                ? (installationId) => {
                    setDeviceRegistrationInstallationId(installationId);
                  }
                : undefined
            }
            onEditInstallation={(inst) => setEditingInstallation(inst)}
            onInstallationClick={(id) => {
              // Navigate to first device of this installation
              const device = devices.find(d => d.installation_id === id);
              if (device) {
                router.push(`/dashboard/${device.id}`);
              } else {
                // Show message if no devices are available for this installation
                const message = t('installations.noDevices');
                alert(message);
              }
            }}
            onToggleReverseSSH={handleToggleReverseSSH}
          />
        </div>
      </main>

      {showInstallationRegistration && user && (
        <InstallationRegistration
          userId={user.id}
          onClose={() => setShowInstallationRegistration(false)}
          onSuccess={() => {
            handleInstallationRegistered();
            setShowInstallationRegistration(false);
          }}
        />
      )}

      {editingInstallation && user && (
        <InstallationRegistration
          userId={user.id}
          installation={editingInstallation}
          onClose={() => setEditingInstallation(null)}
          onSuccess={(updated) => {
            setInstallations((prev) =>
              prev.map((inst) => (inst.id === updated.id ? updated : inst))
            );
            setEditingInstallation(null);
          }}
        />
      )}

      {deviceRegistrationInstallationId !== null && (
        <DeviceRegistration
          installationId={deviceRegistrationInstallationId}
          onClose={() => setDeviceRegistrationInstallationId(null)}
          onSuccess={() => {
            handleDeviceRegistered();
            setDeviceRegistrationInstallationId(null);
          }}
        />
      )}
    </div>
  );
}

export default function LandingPage() {
  return (
    <ProtectedRoute>
      <LandingPageContent />
    </ProtectedRoute>
  );
}
