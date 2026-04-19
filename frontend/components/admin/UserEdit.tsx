'use client';

/**
 * User Edit Component (Admin)
 * Form to edit an existing user account
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, UserUpdate, usersApi, ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserEditProps {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserEdit({ user, onClose, onSuccess }: UserEditProps) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserUpdate>({
    email: user.email,
    role: user.role,
    is_active: user.is_active,
    full_name: user.full_name || '',
    phone: user.phone || '',
    language_preference: user.language_preference || 'nl',
  });
  const [newPassword, setNewPassword] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Only include password if it's been set
      const dataToSend: UserUpdate = { ...formData };
      if (newPassword && newPassword.trim() !== '') {
        if (newPassword.length < 12) {
          setError(t('users.passwordMinLength') || 'Password must be at least 12 characters');
          setLoading(false);
          return;
        }
        dataToSend.password = newPassword;
      } else {
        // Don't send password field if empty
        delete dataToSend.password;
      }

      await usersApi.updateUser(user.id, dataToSend, token);
      onSuccess();
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('users.updateError') || 'Failed to update user');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-text">
          {t('users.editUser') || 'Edit User'}
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
                {t('users.email') || 'Email'} *
              </label>
              <input
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('users.fullName') || 'Full Name'}
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder={t('users.fullNamePlaceholder') || 'Optional'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('users.role') || 'Role'} *
              </label>
              <select
                required
                value={formData.role || 'customer'}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'customer' })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
              >
                <option value="customer">{t('users.customer') || 'Customer'}</option>
                <option value="admin">{t('users.admin') || 'Admin'}</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="accent-accent-1"
                />
                <span className="text-sm text-text">
                  {t('users.active') || 'Active'}
                </span>
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text">
                  {t('users.password') || 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordField(!showPasswordField);
                    if (showPasswordField) {
                      setNewPassword('');
                    }
                  }}
                  className="text-xs text-accent-1 hover:text-accent-1/80 transition-colors"
                >
                  {showPasswordField ? (t('users.cancelPasswordChange') || 'Cancel') : (t('users.changePassword') || 'Change Password')}
                </button>
              </div>
              {showPasswordField && (
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                  minLength={12}
                  placeholder={t('users.newPasswordPlaceholder') || 'Enter new password (min 12 characters)'}
                />
              )}
              {!showPasswordField && (
                <p className="text-xs text-text-muted">
                  {t('users.passwordNotChanged') || 'Password will not be changed'}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.email}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90 disabled:opacity-50"
            >
              {loading ? (t('common.loading') || 'Loading...') : (t('common.save') || 'Save')}
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

