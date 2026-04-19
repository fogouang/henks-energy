'use client';

/**
 * System Settings Page
 * Admin-only page for configuring system-wide settings
 */

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { systemSettingsApi, ReverseSSHSettings } from '@/lib/api/client';

export default function SystemSettingsPage() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Reverse SSH settings
  const [reverseSSHSettings, setReverseSSHSettings] = useState<ReverseSSHSettings>({
    host: '',
    user: '',
    port: 22,
  });

  useEffect(() => {
    if (token) {
      loadSettings();
    }
  }, [token]);

  const loadSettings = async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const settings = await systemSettingsApi.getReverseSSHSettings(token);
      setReverseSSHSettings(settings);
    } catch (err: any) {
      setError(err.detail || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReverseSSH = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      await systemSettingsApi.updateReverseSSHSettings(reverseSSHSettings, token);
      setSuccess(t('admin.settingsSaved') || 'Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.detail || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout error={error} onClearError={() => setError(null)}>
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 text-text">
          {t('admin.systemSettings') || 'System Settings'}
        </h1>

        {success && (
          <div className="mb-6 p-4 rounded-md bg-success/20 border border-success/50 text-success">
            {success}
          </div>
        )}

        {isLoading ? (
          <div className="card p-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-text-muted">{t('common.loading') || 'Loading...'}</div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Reverse SSH Settings */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4 text-text">
                {t('admin.reverseSSHSettings') || 'Reverse SSH Settings'}
              </h2>
              <p className="text-sm text-text-muted mb-6">
                {t('admin.reverseSSHDescription') || 'Configure the systemwide SSH server settings for reverse SSH tunnels. These settings apply to all edge devices.'}
              </p>
              
              <form onSubmit={handleSaveReverseSSH} className="space-y-4">
                <div>
                  <label 
                    htmlFor="ssh-host" 
                    className="block text-sm font-medium mb-1 text-text"
                  >
                    {t('admin.sshHost') || 'SSH Server Hostname'}
                  </label>
                  <input
                    id="ssh-host"
                    type="text"
                    value={reverseSSHSettings.host}
                    onChange={(e) => setReverseSSHSettings({ ...reverseSSHSettings, host: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                    placeholder="support.example.com"
                    required
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    {t('admin.sshHostHelp') || 'The hostname or IP address of the SSH server for reverse tunnels'}
                  </p>
                </div>

                <div>
                  <label 
                    htmlFor="ssh-user" 
                    className="block text-sm font-medium mb-1 text-text"
                  >
                    {t('admin.sshUser') || 'SSH Username'}
                  </label>
                  <input
                    id="ssh-user"
                    type="text"
                    value={reverseSSHSettings.user}
                    onChange={(e) => setReverseSSHSettings({ ...reverseSSHSettings, user: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                    placeholder="rpi-tunnel"
                    required
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    {t('admin.sshUserHelp') || 'The username for SSH connections'}
                  </p>
                </div>

                <div>
                  <label 
                    htmlFor="ssh-port" 
                    className="block text-sm font-medium mb-1 text-text"
                  >
                    {t('admin.sshPort') || 'SSH Port'}
                  </label>
                  <input
                    id="ssh-port"
                    type="number"
                    min="1"
                    max="65535"
                    value={reverseSSHSettings.port}
                    onChange={(e) => setReverseSSHSettings({ ...reverseSSHSettings, port: parseInt(e.target.value) || 22 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                    required
                  />
                  <p className="mt-1 text-xs text-text-muted">
                    {t('admin.sshPortHelp') || 'The SSH server port (default: 22)'}
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-accent-1 text-white rounded-md transition-colors hover:bg-accent-1/90 disabled:opacity-50"
                  >
                    {isSaving 
                      ? (t('common.saving') || 'Saving...') 
                      : (t('common.save') || 'Save Settings')
                    }
                  </button>
                </div>
              </form>
            </div>

            {/* Info Box */}
            <div className="bg-info/20 border border-info/50 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-info mr-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-info">
                    {t('admin.settingsNote') || 'Note'}
                  </h3>
                  <p className="text-sm text-info/90 mt-1">
                    {t('admin.settingsNoteText') || 'These settings override environment variables. Changes take effect immediately for new API requests.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

