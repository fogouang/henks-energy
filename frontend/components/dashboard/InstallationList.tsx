'use client';

/**
 * Installation List Component
 * Displays a list of installations in table format (similar to UserList)
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Installation } from '@/lib/api/client';

interface InstallationListProps {
  installations: Installation[];
  onInstallationClick?: (installationId: number) => void;
  onEdit?: (installationId: number) => void;
  onDelete?: (installationId: number) => void;
  onActivate?: (installationId: number) => void;
  onDeactivate?: (installationId: number) => void;
}

export function InstallationList({ 
  installations, 
  onInstallationClick, 
  onEdit, 
  onDelete,
  onActivate,
  onDeactivate,
}: InstallationListProps) {
  const { t } = useLanguage();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatLocation = (installation: Installation) => {
    const parts = [installation.city];
    if (installation.state) {
      parts.push(installation.state);
    }
    parts.push(installation.country);
    return parts.join(', ');
  };

  // Since the API filters by deleted_at.is_(None), all installations returned are active
  // We'll only show "Deactivate" button for active installations
  // If we need to show deactivated installations, we'd need to modify the API

  if (installations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">{t('installations.noInstallations') || 'No installations found'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full card">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.name') || 'Name'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.location') || 'Location'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.owner') || 'Owner'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.components') || 'Components'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.inverters') || 'Inverters'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('installations.created') || 'Created'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('common.actions') || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {installations.map((installation) => {
            const components = [
              installation.has_pv && t('installations.componentPv'),
              installation.has_battery && t('installations.componentBattery'),
              installation.has_generator && t('installations.componentGenerator'),
              installation.has_ev_chargers && t('installations.componentEvChargers'),
            ].filter(Boolean).join(', ');

            return (
              <tr key={installation.id} className="hover:bg-border/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className={`text-sm font-medium ${onInstallationClick ? 'cursor-pointer text-text hover:text-accent-1' : 'text-text'}`}
                    onClick={() => onInstallationClick && onInstallationClick(installation.id)}
                  >
                    {installation.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-muted">
                    {formatLocation(installation)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-muted">
                    {installation.owner_email || t('common.empty')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-muted">
                    {components || t('common.empty')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-muted">
                    {installation.inverter_count}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-text-muted">
                    {formatDate(installation.created_at)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {onInstallationClick && (
                      <button
                        onClick={() => onInstallationClick(installation.id)}
                        className="px-3 py-1 rounded transition-colors text-xs bg-accent-1 text-white hover:bg-accent-1/90"
                      >
                        {t('installations.view') || 'View'}
                      </button>
                    )}
                    {onEdit && (
                      <button
                        onClick={() => onEdit(installation.id)}
                        className="px-3 py-1 rounded transition-colors text-xs bg-border text-text hover:bg-border/80"
                      >
                        {t('common.edit') || 'Edit'}
                      </button>
                    )}
                    {/* Since API filters by deleted_at, all installations shown are active - show Deactivate */}
                    {onDeactivate && (
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(t('installations.confirmDeactivate') || 'Are you sure you want to deactivate this installation?');
                          if (confirmed) {
                            onDeactivate(installation.id);
                          }
                        }}
                        className="px-3 py-1 rounded transition-colors text-xs bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
                      >
                        {t('common.deactivate') || 'Deactivate'}
                      </button>
                    )}
                    {/* Note: Activate button would only show if we modify API to return deactivated installations */}
                    {onDelete && (
                      <button
                        onClick={() => {
                          const confirmed = window.confirm(t('installations.confirmDelete') || 'Are you sure you want to delete this installation?');
                          if (confirmed) {
                            onDelete(installation.id);
                          }
                        }}
                        className="px-3 py-1 rounded transition-colors text-xs bg-critical/20 border border-critical/50 text-critical hover:bg-critical/30"
                      >
                        {t('common.delete') || 'Delete'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

