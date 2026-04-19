'use client';

/**
 * Login Page
 */

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ApiClientError } from '@/lib/api/client';
import { Logo } from '@/components/common/Logo';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await login(email, password);
      // Redirect to dashboard on success
      router.push('/');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail || t('auth.loginError'));
      } else {
        setError(t('auth.loginError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-4">
        <div className="bg-surface rounded-lg shadow-md p-8 border border-border">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <p className="text-sm text-text-muted">
              {t('auth.loginSubtitle')}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded bg-critical/20 border border-critical/50 text-critical">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-text">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-2 bg-surface text-text"
                placeholder={t('auth.emailPlaceholder')}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2 text-text">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent-2 bg-surface text-text"
                placeholder={t('auth.passwordPlaceholder')}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 rounded-md text-text font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-accent-1 hover:bg-accent-1/90"
            >
              {isLoading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          {/* Demo Credentials Hint - hidden in production */}
          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 p-3 rounded text-xs bg-accent-1/20 border border-accent-1/50 text-accent-1">
              <p className="font-medium mb-1">{t('auth.demoHint')}</p>
              <p>Email: admin@jsenergy.nl</p>
              <p>Password: admin123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

