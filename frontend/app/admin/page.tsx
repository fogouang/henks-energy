'use client';

/**
 * Admin Dashboard Page
 * Redirects to User Management by default
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AdminDashboard() {
  const { token, user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    
    if (!token || !user) {
      router.push('/login');
      return;
    }
    
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
    
    // Redirect to User Management page
    router.push('/admin/users');
  }, [token, user, isLoading, router]);

  // Show loading while redirecting
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
