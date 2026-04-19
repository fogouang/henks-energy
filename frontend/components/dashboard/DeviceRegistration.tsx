'use client';

/**
 * Device Registration Component
 * Modal/form to register new edge device with provisioning screen
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EdgeDevice, EdgeDeviceCreate, edgeDevicesApi, ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface DeviceRegistrationProps {
  installationId: number; // Required: installation this device belongs to
  onClose: () => void;
  onSuccess: (device: EdgeDevice) => void;
}

export function DeviceRegistration({ installationId, onClose, onSuccess }: DeviceRegistrationProps) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [step, setStep] = useState<'form' | 'provisioning'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<EdgeDeviceCreate>({
    name: '',
    installation_id: installationId, // Set from prop
    description: '',
  });
  const [provisionedDevice, setProvisionedDevice] = useState<EdgeDevice | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    // Installation ID is already set from props, no need to validate

    setLoading(true);
    setError(null);

    try {
      const device = await edgeDevicesApi.createDevice(
        formData.installation_id,
        formData,
        token
      );
      setProvisionedDevice(device);
      setStep('provisioning');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('devices.registrationError') || 'Failed to register device');
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getApiUrl = () => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  };

  const getEnvVars = () => {
    if (!provisionedDevice) return '';
    return `TOKEN=${provisionedDevice.token}
API_URL=${getApiUrl()}
INSTALLATION_ID=${provisionedDevice.installation_id}
DEVICE_ID=${provisionedDevice.device_id}`;
  };

  if (step === 'provisioning' && provisionedDevice) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="card shadow-xl max-w-2xl w-full mx-4 p-6">
          <h2 className="text-2xl font-bold mb-4 text-text">
            {t('devices.deviceProvisioned') || 'Device Provisioned Successfully'}
          </h2>

          <div className="mb-4 p-4 rounded-md bg-warning/20 border border-warning/50">
            <p className="text-sm font-medium text-warning">
              ⚠️ {t('devices.saveTokenWarning') || 'Save this token now - it won\'t be shown again!'}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text">
              {t('devices.environmentVariables') || 'Environment Variables'}
            </label>
            <div className="relative">
              <pre
                className="p-4 rounded-md text-sm font-mono overflow-x-auto bg-border text-text"
              >
                {getEnvVars()}
              </pre>
              <button
                onClick={() => copyToClipboard(getEnvVars())}
                className="absolute top-2 right-2 px-3 py-1 rounded text-xs font-medium transition-colors bg-accent-1 text-white hover:bg-accent-1/90"
              >
                {copied ? (t('common.copied') || 'Copied!') : (t('common.copy') || 'Copy')}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                onSuccess(provisionedDevice);
                onClose();
              }}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90"
            >
              {t('devices.iveSavedThis') || 'I\'ve saved this'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors bg-border text-text hover:bg-border/80"
            >
              {t('common.close') || 'Close'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-2xl font-bold mb-4 text-text">
          {t('devices.registerDevice') || 'Register New Device'}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/20 border border-critical/50 text-critical">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('devices.deviceName') || 'Device Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder={t('devices.deviceNamePlaceholder') || 'e.g., Raspberry Pi 1'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('devices.installation') || 'Installation'} *
              </label>
              <p className="text-xs mb-2 text-text-muted">
                {t('devices.installationHelp') || 'Installation ID: {installationId}'}
              </p>
              <input
                type="text"
                value={installationId}
                disabled
                className="w-full px-3 py-2 border border-border rounded-md bg-border/50 text-text-muted cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('devices.description') || 'Description'} (optional)
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                rows={3}
                placeholder={t('devices.descriptionPlaceholder') || 'Optional device description'}
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.name}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90 disabled:opacity-50"
            >
              {loading ? (t('common.loading') || 'Loading...') : (t('devices.register') || 'Register')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors bg-border text-text hover:bg-border/80"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

