'use client';

/**
 * Language Switcher Component
 */

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/lib/i18n/config';

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setLanguage('nl')}
        className="px-3 py-1 rounded text-sm transition-colors"
        style={
          language === 'nl'
            ? { backgroundColor: '#F16D2B', color: '#ffffff' }
            : { backgroundColor: '#f3f4f6', color: '#374151' }
        }
        onMouseEnter={(e) => {
          if (language !== 'nl') {
            e.currentTarget.style.backgroundColor = '#d1d5db';
          }
        }}
        onMouseLeave={(e) => {
          if (language !== 'nl') {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
      >
        NL
      </button>
      <button
        onClick={() => setLanguage('en')}
        className="px-3 py-1 rounded text-sm transition-colors"
        style={
          language === 'en'
            ? { backgroundColor: '#F16D2B', color: '#ffffff' }
            : { backgroundColor: '#f3f4f6', color: '#374151' }
        }
        onMouseEnter={(e) => {
          if (language !== 'en') {
            e.currentTarget.style.backgroundColor = '#d1d5db';
          }
        }}
        onMouseLeave={(e) => {
          if (language !== 'en') {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }
        }}
      >
        EN
      </button>
    </div>
  );
}

