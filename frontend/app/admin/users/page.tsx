'use client';

/**
 * User Management Page (Admin)
 * Manages user accounts, roles, and permissions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { UserList } from '@/components/admin/UserList';
import { UserRegistration } from '@/components/admin/UserRegistration';
import { UserEdit } from '@/components/admin/UserEdit';
import { usersApi, User, ApiClientError } from '@/lib/api/client';

export default function UserManagementPage() {
  const { token, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const usersRes = await usersApi.getUsers(token, { include_deleted: showDeleted });
      setUsers(usersRes.users);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('admin.loadError') || 'Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  }, [token, t, showDeleted]);

  useEffect(() => {
    if (isLoading) return;
    if (!token || !user) return;
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    loadData();
  }, [token, user, isLoading, router, loadData]);

  const handleUserCreate = async () => {
    await loadData();
  };

  const handleUserActivate = async (userId: number) => {
    if (!token) return;
    try {
      await usersApi.activateUser(userId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleUserDeactivate = async (userId: number) => {
    if (!token) return;
    try {
      await usersApi.deactivateUser(userId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleUserDelete = async (userId: number) => {
    if (!token) return;
    try {
      await usersApi.deleteUser(userId, token);
      await loadData();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      }
    }
  };

  const handleUserEdit = (userId: number) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      setEditingUser(userToEdit);
    }
  };

  const handleUserUpdate = async () => {
    await loadData();
  };

  // Show loading state
  if (loading && users.length === 0) {
    return (
      <AdminLayout error={error} onClearError={() => setError(null)}>
        <div className="text-center py-12">
          <div className="text-lg" style={{ color: '#6b7280' }}>
            {t('common.loading') || 'Loading...'}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout error={error} onClearError={() => setError(null)}>
      <div>
        <div className="mb-4 flex flex-wrap justify-between items-center gap-4">
          <p style={{ color: '#6b7280' }}>
            {t('admin.userManagementDesc') || 'Manage user accounts, roles, and permissions'}
          </p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: '#374151' }}>
              <input
                type="checkbox"
                checked={showDeleted}
                onChange={(e) => setShowDeleted(e.target.checked)}
                className="rounded border-gray-300"
              />
              {t('users.showDeleted') || 'Show deleted users'}
            </label>
            <button
            onClick={() => setShowUserModal(true)}
            className="px-4 py-2 rounded-md transition-colors font-medium"
            style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D85A1F';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F16D2B';
            }}
            >
              {t('users.createUser') || 'Create User'}
            </button>
          </div>
        </div>
        <UserList
          users={users}
          currentUserId={user?.id}
          onUserClick={(userId) => router.push(`/admin/users/${userId}`)}
          onEdit={handleUserEdit}
          onActivate={handleUserActivate}
          onDeactivate={handleUserDeactivate}
          onDelete={handleUserDelete}
        />
      </div>

      {showUserModal && (
        <UserRegistration
          onClose={() => setShowUserModal(false)}
          onSuccess={handleUserCreate}
        />
      )}

      {editingUser && (
        <UserEdit
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={handleUserUpdate}
        />
      )}
    </AdminLayout>
  );
}

