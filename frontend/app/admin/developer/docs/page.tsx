'use client';

/**
 * Developer Documentation Page (Admin)
 * API documentation and integration examples for developers
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { ApiDocumentation } from '@/components/admin/ApiDocumentation';

export default function DeveloperDocsPage() {
  const { t } = useLanguage();

  return (
    <AdminLayout>
      <div>
        <div className="mb-4">
          <p className="text-text-muted">
            {t('admin.developerDesc') || 'API documentation and integration examples for developers'}
          </p>
        </div>
        <ApiDocumentation />
      </div>
    </AdminLayout>
  );
}

