'use client';

/**
 * User Registration Component (Admin)
 * Form to create a new user account with credentials display
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, UserCreate, UserCredentials, usersApi, ApiClientError } from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserRegistrationProps {
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export function UserRegistration({ onClose, onSuccess }: UserRegistrationProps) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const [step, setStep] = useState<'form' | 'credentials'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<UserCreate>({
    email: '',
    password: '',
    role: 'customer',
    is_active: true,
    full_name: '',
    phone: '',
    language_preference: 'nl',
  });
  const [credentials, setCredentials] = useState<UserCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // Don't send password if empty (will be auto-generated)
      const dataToSend = { ...formData };
      if (!dataToSend.password || dataToSend.password.trim() === '') {
        delete dataToSend.password;
      }

      const creds = await usersApi.createUser(dataToSend, token);
      setCredentials(creds);
      setStep('credentials');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('users.registrationError') || 'Failed to create user');
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

  const getCredentialsText = () => {
    if (!credentials) return '';
    return `Email: ${credentials.email}\nPassword: ${credentials.password}`;
  };

  if (step === 'credentials' && credentials) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="card shadow-xl max-w-md w-full mx-4 p-6">
          <h2 className="text-2xl font-bold mb-4" style={{ color: '#1a2332' }}>
            {t('users.userCreated') || 'User Created Successfully'}
          </h2>

          <div className="mb-4 p-4 rounded-md bg-warning/20 border border-warning/50">
            <p className="text-sm font-medium text-warning">
              ⚠️ {t('users.saveCredentialsWarning') || 'Save these credentials now - the password will not be shown again!'}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-text">
              {t('users.credentials') || 'User Credentials'}
            </label>
            <div className="relative">
              <pre
                className="p-4 rounded-md text-sm font-mono overflow-x-auto bg-border text-text"
              >
                {getCredentialsText()}
              </pre>
              <button
                onClick={() => copyToClipboard(getCredentialsText())}
                className="absolute top-2 right-2 px-3 py-1 rounded text-xs font-medium transition-colors"
                style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#D85A1F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F16D2B';
                }}
              >
                {copied ? (t('common.copied') || 'Copied!') : (t('common.copy') || 'Copy')}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                onSuccess({} as User); // Reload will happen in parent
                onClose();
              }}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium"
              style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#D85A1F';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#F16D2B';
              }}
            >
              {t('users.iveSavedThis') || 'I\'ve saved this'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors"
              style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
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
      <div className="card shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#1a2332' }}>
          {t('users.createUser') || 'Create New User'}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/20 border border-critical/50 text-critical">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                {t('users.email') || 'Email'} *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: '#d1d5db' }}
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                {t('users.password') || 'Password'} (optional)
              </label>
              <p className="text-xs mb-2" style={{ color: '#6b7280' }}>
                {t('users.passwordHelp') || 'Leave empty to generate a random password'}
              </p>
              <input
                type="password"
                value={formData.password || ''}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: '#d1d5db' }}
                minLength={12}
                placeholder={t('users.passwordPlaceholder') || 'Min 12 characters or leave empty'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                {t('users.fullName') || 'Full Name'}
              </label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: '#d1d5db' }}
                placeholder={t('users.fullNamePlaceholder') || 'Optional'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#374151' }}>
                {t('users.role') || 'Role'} *
              </label>
              <select
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'customer' })}
                className="w-full px-3 py-2 border rounded-md"
                style={{ borderColor: '#d1d5db' }}
              >
                <option value="customer">{t('users.customer') || 'Customer'}</option>
                <option value="admin">{t('users.admin') || 'Admin'}</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span className="text-sm" style={{ color: '#374151' }}>
                  {t('users.active') || 'Active'}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.email}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium disabled:opacity-50"
              style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#D85A1F';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.backgroundColor = '#F16D2B';
                }
              }}
            >
              {loading ? (t('common.loading') || 'Loading...') : (t('users.create') || 'Create User')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors"
              style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }}
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

