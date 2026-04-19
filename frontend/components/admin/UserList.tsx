'use client';

/**
 * User List Component (Admin)
 * Displays a list of users with management actions
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { User } from '@/lib/api/client';

interface UserListProps {
  users: User[];
  currentUserId?: number; // ID of the current logged-in user
  onUserClick?: (userId: number) => void;
  onEdit?: (userId: number) => void;
  onActivate?: (userId: number) => void;
  onDeactivate?: (userId: number) => void;
  onDelete?: (userId: number) => void;
}

export function UserList({ 
  users, 
  currentUserId,
  onUserClick, 
  onEdit, 
  onActivate,
  onDeactivate,
  onDelete,
}: UserListProps) {
  const { t } = useLanguage();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never') || 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted mb-4">{t('users.noUsers') || 'No users found'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full card">
        <thead>
          <tr className="border-b border-border">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.email') || 'Email'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.name') || 'Name'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.role') || 'Role'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.status') || 'Status'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.lastLogin') || 'Last Login'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('users.view') || 'View'}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-text-muted">
              {t('common.actions') || 'Actions'}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => {
            const isDeleted = !!user.deleted_at;
            return (
            <tr
              key={user.id}
              className={`hover:bg-border/50 ${isDeleted ? 'opacity-60' : ''}`}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-text">
                  {user.email}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-text-muted">
                  {user.full_name || '-'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin'
                      ? 'bg-accent-1/20 text-accent-1 border border-accent-1/50'
                      : 'bg-accent-2/20 text-accent-2 border border-accent-2/50'
                  }`}
                >
                  {user.role === 'admin' ? (t('users.admin') || 'Admin') : (t('users.customer') || 'Customer')}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {isDeleted ? (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">
                    {t('users.deleted') || 'Deleted'}
                  </span>
                ) : (
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.is_active ? (t('users.active') || 'Active') : (t('users.inactive') || 'Inactive')}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm" style={{ color: '#6b7280' }}>
                  {formatDate(user.last_login_at)}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex gap-2">
                  {!isDeleted && onUserClick && (
                    <button
                      onClick={() => onUserClick(user.id)}
                      className="px-3 py-1 rounded transition-colors text-xs"
                      style={{ backgroundColor: '#F16D2B', color: '#ffffff' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#D85A1F';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F16D2B';
                      }}
                    >
                      {t('users.view') || 'View'}
                    </button>
                  )}
                  {!isDeleted && onEdit && (
                    <button
                      onClick={() => onEdit(user.id)}
                      className="px-3 py-1 rounded transition-colors text-xs"
                      style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                    >
                      {t('common.edit') || 'Edit'}
                    </button>
                  )}
                  {!isDeleted && user.is_active && onDeactivate && user.id !== currentUserId && (
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(t('users.confirmDeactivate') || 'Are you sure you want to deactivate this user?');
                        if (confirmed) {
                          onDeactivate(user.id);
                        }
                      }}
                      className="px-3 py-1 rounded transition-colors text-xs bg-critical/20 border border-critical/50 text-critical"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
                    >
                      {t('common.deactivate') || 'Deactivate'}
                    </button>
                  )}
                  {!isDeleted && !user.is_active && onActivate && user.id !== currentUserId && (
                    <button
                      onClick={() => onActivate(user.id)}
                      className="px-3 py-1 rounded transition-colors text-xs"
                      style={{ backgroundColor: '#d1fae5', color: '#065f46' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#a7f3d0';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#d1fae5';
                      }}
                    >
                      {t('common.activate') || 'Activate'}
                    </button>
                  )}
                  {!isDeleted && onDelete && user.id !== currentUserId && (
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(t('users.confirmDelete') || 'Are you sure you want to delete this user?');
                        if (confirmed) {
                          onDelete(user.id);
                        }
                      }}
                      className="px-3 py-1 rounded transition-colors text-xs bg-critical/20 border border-critical/50 text-critical"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#fecaca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                      }}
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

