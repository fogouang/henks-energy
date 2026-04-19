'use client';

/**
 * Firmware Management Page (Admin)
 * Upload and manage edge device firmware versions
 */

import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { FirmwareManagement } from '@/components/admin/FirmwareManagement';

export default function FirmwareManagementPage() {
  const { t } = useLanguage();
  const [error, setError] = useState<string | null>(null);

  const handleOpenUpload = () => {
    // Trigger upload form in FirmwareManagement component
    const event = new CustomEvent('openFirmwareUpload');
    window.dispatchEvent(event);
  };

  return (
    <AdminLayout error={error} onClearError={() => setError(null)}>
      <div>
        <div className="mb-4 flex justify-between items-center">
          <p style={{ color: '#6b7280' }}>
            {t('admin.firmwareManagementDesc') || 'Upload and manage edge device firmware versions'}
          </p>
          <button
            onClick={handleOpenUpload}
            className="px-4 py-2 rounded-md transition-colors font-medium"
            style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#D85A1F';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#F16D2B';
            }}
          >
            {t('firmware.uploadFirmware') || 'Upload Firmware'}
          </button>
        </div>
        <FirmwareManagement onError={(err) => setError(err)} />
      </div>
    </AdminLayout>
  );
}

