'use client';

/**
 * Admin Layout Component
 * Shared layout for all admin pages with header and navigation
 */

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Logo } from '@/components/common/Logo';
import { UserMenu } from '@/components/dashboard/UserMenu';

interface AdminLayoutProps {
  children: React.ReactNode;
  error?: string | null;
  onClearError?: () => void;
}

type AdminTab = {
  id: string;
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function AdminLayout({ children, error, onClearError }: AdminLayoutProps) {
  const { token, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!token || !user) return;
    if (user.role !== 'admin') {
      router.push('/');
    }
  }, [token, user, isLoading, router]);

  const tabs: AdminTab[] = [
    {
      id: 'users',
      href: '/admin/users',
      label: t('admin.userManagement') || 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
    },
    {
      id: 'firmware',
      href: '/admin/developer/firmware',
      label: t('admin.firmwareManagement') || 'Firmware Management',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      href: '/admin/settings',
      label: t('admin.systemSettings') || 'System Settings',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'developer',
      href: '/admin/developer/docs',
      label: t('admin.developer') || 'Developer',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      ),
    },
  ];

  const isActiveTab = (href: string) => {
    if (href === '/admin/users') {
      return pathname === '/admin/users' || pathname?.startsWith('/admin/users/');
    }
    if (href === '/admin/developer/firmware') {
      return pathname === '/admin/developer/firmware';
    }
    if (href === '/admin/developer/docs') {
      return pathname === '/admin/developer/docs';
    }
    if (href === '/admin/settings') {
      return pathname === '/admin/settings';
    }
    return pathname === href;
  };

  // Show loading while checking auth
  if (isLoading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg text-text-muted">
            {t('common.loading') || 'Loading...'}
          </div>
        </div>
      </div>
    );
  }

  // Redirect non-admin users
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
                    {t('admin.title') || 'Admin Dashboard'}
                  </h1>
                  <button
                    onClick={() => router.push('/')}
                    className="text-sm mt-1 text-text-muted hover:text-text transition-colors"
                  >
                    ← {t('common.backToDashboard') || 'Back to Dashboard'}
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
          {error && (
            <div 
              className="mb-6 p-4 rounded-md flex justify-between items-center bg-critical/20 border border-critical/50 text-critical"
            >
              <span>{error}</span>
              {onClearError && (
                <button 
                  onClick={onClearError}
                  className="ml-4 text-sm underline hover:no-underline text-text-muted hover:text-text"
                >
                  {t('common.dismiss') || 'Dismiss'}
                </button>
              )}
            </div>
          )}

          {/* Tabs */}
          <div className="mb-6">
            <div className="flex border-b border-border">
              {tabs.map((tab) => {
                const isActive = isActiveTab(tab.href);
                return (
                  <Link
                    key={tab.id}
                    href={tab.href}
                    className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                      isActive ? 'text-accent-1' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </div>
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-1" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Page Content */}
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

