'use client';

/**
 * User Menu Dropdown Component
 * Displays user info, language selection, and logout
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n/config';

export function UserMenu() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isOpen ? 'bg-surface border border-border' : 'bg-surface hover:bg-border'
        } text-text`}
      >
        <span className="text-text-muted">
          {user.full_name || user.email}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 9L1 4H11L6 9Z"
            fill="currentColor"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-surface rounded-md shadow-lg border border-border z-[1000]"
        >
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-2 border-b border-border">
              <div className="text-sm font-medium text-text">
                {user.full_name || user.email}
              </div>
              {user.email && user.full_name && (
                <div className="text-xs text-text-muted">
                  {user.email}
                </div>
              )}
            </div>

            {/* Language Selection */}
            <div className="px-4 py-2 border-b border-border">
              <div className="text-xs font-medium mb-2 text-text-muted">
                {t('common.language') || 'Language'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLanguage('nl');
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    language === 'nl'
                      ? 'bg-accent-1 text-text'
                      : 'bg-surface border border-border text-text hover:bg-border'
                  }`}
                >
                  NL
                </button>
                <button
                  onClick={() => {
                    setLanguage('en');
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    language === 'en'
                      ? 'bg-accent-1 text-text'
                      : 'bg-surface border border-border text-text hover:bg-border'
                  }`}
                >
                  EN
                </button>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm transition-colors text-text hover:bg-border"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

