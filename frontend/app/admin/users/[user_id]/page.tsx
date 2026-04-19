'use client';

/**
 * User Detail Page (Admin)
 * Shows all installations for a specific user
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { InstallationList } from '@/components/dashboard/InstallationList';
import { InstallationRegistration } from '@/components/dashboard/InstallationRegistration';
import { installationsApi, usersApi, Installation, User, ApiClientError } from '@/lib/api/client';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Logo } from '@/components/common/Logo';
import { UserMenu } from '@/components/dashboard/UserMenu';

function UserDetailPage() {
  const { token, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const params = useParams();
  const userId = parseInt(params.user_id as string, 10);

  const [userData, setUserData] = useState<User | null>(null);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInstallationModal, setShowInstallationModal] = useState(false);
  const [editingInstallation, setEditingInstallation] = useState<Installation | null>(null);

  const loadData = useCallback(async () => {
    if (!token || !userId) return;
    setLoading(true);
    setError(null);

    try {
      const [usersRes, installationsRes] = await Promise.all([
        usersApi.getUsers(token),
        installationsApi.getUserInstallations(userId, token),
      ]);

      const foundUser = usersRes.users.find(u => u.id === userId);
      if (!foundUser) {
        setError('User not found');
        setLoading(false);
        return;
      }

      setUserData(foundUser);
      setInstallations(installationsRes.installations);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('admin.loadError') || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [token, userId, t]);

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

  const handleInstallationCreate = async () => {
    await loadData();
  };

  const handleInstallationActivate = async (installationId: number) => {
    if (!token) return;
    try {
      await installationsApi.activateInstallation(installationId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleInstallationDeactivate = async (installationId: number) => {
    if (!token) return;
    try {
      await installationsApi.deactivateInstallation(installationId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleInstallationDelete = async (installationId: number) => {
    if (!token) return;
    try {
      await installationsApi.deleteInstallation(installationId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
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
                    {userData ? `${userData.full_name || userData.email}` : 'User Details'}
                  </h1>
                  <button
                    onClick={() => router.push('/admin/users')}
                    className="text-sm mt-1"
                    style={{ color: '#6b7280' }}
                  >
                    ← {t('common.back') || 'Back to User Management'}
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
            {userData && (
              <p className="mt-2 text-text-muted">
                {userData.email} • {userData.role === 'admin' ? (t('users.admin') || 'Admin') : (t('users.customer') || 'Customer')}
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
              <h2 className="text-xl font-semibold text-text">
                {t('installations.myInstallations') || 'Installations'} ({installations.length})
              </h2>
              {userData && (
                <button
                  onClick={() => setShowInstallationModal(true)}
                  className="px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90"
                >
                  {t('installations.createInstallation') || 'Create Installation'}
                </button>
              )}
            </div>
            <InstallationList
              installations={installations}
              onInstallationClick={(id) => router.push(`/admin/installations/${id}`)}
              onEdit={(id) => {
                const inst = installations.find((i) => i.id === id);
                if (inst) setEditingInstallation(inst);
              }}
              onActivate={handleInstallationActivate}
              onDeactivate={handleInstallationDeactivate}
              onDelete={handleInstallationDelete}
            />
          </div>
        </main>

        {showInstallationModal && userData && (
          <InstallationRegistration
            userId={userData.id}
            onClose={() => setShowInstallationModal(false)}
            onSuccess={() => {
              handleInstallationCreate();
              setShowInstallationModal(false);
            }}
          />
        )}

        {editingInstallation && userData && (
          <InstallationRegistration
            userId={userData.id}
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
      </div>
    </ProtectedRoute>
  );
}

export default UserDetailPage;

