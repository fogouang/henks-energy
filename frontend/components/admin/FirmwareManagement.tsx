'use client';

/**
 * Firmware Management Component (Admin)
 * Upload and manage edge device firmware
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { firmwareApi, FirmwareListItem, ApiClientError } from '@/lib/api/client';

interface FirmwareManagementProps {
  onError?: (error: string) => void;
}

export function FirmwareManagement({ onError }: FirmwareManagementProps) {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [firmware, setFirmware] = useState<FirmwareListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // Upload form state
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFirmware = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    try {
      const response = await firmwareApi.listFirmware(token);
      setFirmware(response.firmware);
    } catch (err) {
      if (err instanceof ApiClientError) {
        onError?.(err.detail);
      } else {
        onError?.(t('firmware.loadError') || 'Failed to load firmware');
      }
    } finally {
      setLoading(false);
    }
  }, [token, onError, t]);

  useEffect(() => {
    loadFirmware();
  }, [loadFirmware]);

  // Listen for custom event to open upload form
  useEffect(() => {
    const handleOpenUpload = () => setShowUploadForm(true);
    window.addEventListener('openFirmwareUpload', handleOpenUpload);
    return () => window.removeEventListener('openFirmwareUpload', handleOpenUpload);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        onError?.(t('firmware.onlyZipAllowed') || 'Only ZIP files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFile) return;

    const buildNum = parseInt(buildNumber, 10);
    if (isNaN(buildNum) || buildNum < 1) {
      onError?.(t('firmware.invalidBuildNumber') || 'Build number must be a positive integer');
      return;
    }

    setUploading(true);

    try {
      await firmwareApi.uploadFirmware(
        selectedFile,
        version,
        buildNum,
        releaseNotes || null,
        token
      );
      
      // Reset form
      setVersion('');
      setBuildNumber('');
      setReleaseNotes('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowUploadForm(false);
      
      // Reload firmware list
      await loadFirmware();
    } catch (err) {
      if (err instanceof ApiClientError) {
        onError?.(err.detail);
      } else {
        onError?.(t('firmware.uploadError') || 'Failed to upload firmware');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (firmwareId: number) => {
    if (!token) return;
    
    const confirmed = window.confirm(
      t('firmware.confirmDelete') || 'Are you sure you want to delete this firmware?'
    );
    if (!confirmed) return;

    try {
      await firmwareApi.deleteFirmware(firmwareId, token);
      await loadFirmware();
    } catch (err) {
      if (err instanceof ApiClientError) {
        onError?.(err.detail);
      } else {
        onError?.(t('firmware.deleteError') || 'Failed to delete firmware');
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="text-text-muted">{t('common.loading') || 'Loading...'}</div>
      </div>
    );
  }

  return (
    <div>
      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-text">
              {t('firmware.uploadFirmware') || 'Upload Firmware'}
            </h3>
            
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  {t('firmware.version') || 'Version'} *
                </label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="e.g., 1.2.0"
                  required
                  maxLength={50}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  {t('firmware.buildNumber') || 'Build Number'} *
                </label>
                <input
                  type="number"
                  value={buildNumber}
                  onChange={(e) => setBuildNumber(e.target.value)}
                  placeholder="e.g., 123"
                  required
                  min={1}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  {t('firmware.file') || 'Firmware File'} * (.zip)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileSelect}
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
                {selectedFile && (
                  <p className="mt-1 text-sm text-text-muted">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  {t('firmware.releaseNotes') || 'Release Notes'}
                </label>
                <textarea
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder={t('firmware.releaseNotesPlaceholder') || 'Optional release notes...'}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadForm(false);
                    setVersion('');
                    setBuildNumber('');
                    setReleaseNotes('');
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-border text-text hover:bg-border/80"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={uploading || !selectedFile}
                  className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90 disabled:opacity-50"
                >
                  {uploading ? (t('common.uploading') || 'Uploading...') : (t('firmware.upload') || 'Upload')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Firmware List */}
      {firmware.length === 0 ? (
        <div className="text-center py-12 card">
          <svg
            className="mx-auto h-12 w-12 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
            />
          </svg>
          <p className="mt-4 text-text-muted">
            {t('firmware.noFirmware') || 'No firmware uploaded yet'}
          </p>
          <button
            onClick={() => setShowUploadForm(true)}
            className="mt-4 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90"
          >
            {t('firmware.uploadFirst') || 'Upload First Firmware'}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full card">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('firmware.version') || 'Version'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('firmware.buildNumber') || 'Build'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('firmware.filename') || 'Filename'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('firmware.size') || 'Size'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('firmware.uploadedAt') || 'Uploaded'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
                  {t('common.actions') || 'Actions'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {firmware.map((fw, index) => (
                <tr key={fw.id} className="hover:bg-border/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text">
                        v{fw.version}
                      </span>
                      {index === 0 && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/20 text-success border border-success/50">
                          {t('firmware.latest') || 'Latest'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-text-muted">
                      #{fw.build_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-text-muted">
                      {fw.filename}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-text-muted">
                      {formatFileSize(fw.file_size)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-text-muted">
                      {formatDate(fw.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(fw.id)}
                      className="px-3 py-1 rounded transition-colors text-xs bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
                    >
                      {t('common.delete') || 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

