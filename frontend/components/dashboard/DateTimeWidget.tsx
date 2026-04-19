'use client';

/**
 * Date and Time Widget - Flip Clock Style
 * Displays current time, location, and date in a retro flip-clock aesthetic
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DateTimeWidgetProps {
  installation?: { city: string; country: string; timezone?: string } | null;
  className?: string;
}

export function DateTimeWidget({ installation, className }: DateTimeWidgetProps) {
  const { t } = useLanguage();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return { hours, minutes };
  };

  const getAmPm = (date: Date) => {
    return date.getHours() >= 12 ? 'PM' : 'AM';
  };

  const formatDay = (date: Date) => {
    return date.toLocaleDateString('en-GB', { weekday: 'long' }).toUpperCase();
  };

  const getLocationName = () => {
    if (!installation) return 'LOCATION';
    return installation.city.toUpperCase();
  };

  const { hours, minutes } = formatTime(time);
  const ampm = getAmPm(time);
  const dayName = formatDay(time);

  return (
    <div
      className={`relative rounded-xl overflow-hidden h-full ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        minHeight: '160px',
      }}
    >
      {/* Subtle texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative p-3 flex flex-col h-full">
        {/* Top Section - Location */}
        <div className="text-center mb-3">
          <div className="text-white text-xs font-medium tracking-wider uppercase">
            {getLocationName()}
          </div>
        </div>

        {/* Middle Section - iOS-style flipping clock */}
        <div className="flex-1 flex items-center justify-center mb-3">
          <div className="flex items-center gap-2">
            {/* Hours */}
            <div className="relative w-[68px] h-[78px] rounded-md overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_12px_rgba(0,0,0,0.4)]">
              {/* Top half */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#2a2a2a] to-[#1b1b1b]" />
              {/* Bottom half */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-[#161616] to-[#0d0d0d]" />
              {/* Flip divider */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold tabular-nums drop-shadow">
                {hours}
              </div>
            </div>

            {/* Colon */}
            <div className="text-white text-4xl font-bold drop-shadow">:</div>

            {/* Minutes */}
            <div className="relative w-[68px] h-[78px] rounded-md overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_12px_rgba(0,0,0,0.4)]">
              {/* Top half */}
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-[#2a2a2a] to-[#1b1b1b]" />
              {/* Bottom half */}
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-[#161616] to-[#0d0d0d]" />
              {/* Flip divider */}
              <div className="absolute left-0 right-0 top-1/2 h-px bg-white/10" />
              {/* Center text */}
              <div className="absolute inset-0 flex items-center justify-center text-white text-4xl font-bold tabular-nums drop-shadow">
                {minutes}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section - Day and AM/PM */}
        <div className="flex items-center justify-between">
          <div className="text-white text-xs font-medium uppercase tracking-wider">
            {dayName}
          </div>
          <div className="text-white text-xs font-medium uppercase tracking-wider">
            {ampm}
          </div>
        </div>
      </div>
    </div>
  );
}
