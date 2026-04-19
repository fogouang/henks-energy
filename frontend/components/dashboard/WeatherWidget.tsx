'use client';

/**
 * Weather Widget - Combined Today and Forecast
 * Glassmorphism style with Unsplash/Pexels background images
 */

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { weatherApi, WeatherData, ApiClientError } from '@/lib/api/client';

interface WeatherWidgetProps {
  installationId: number | null;
  installation?: { city: string; country: string; state?: string | null } | null;
  token: string | null;
  className?: string;
}

// Calculate sunset/sunrise times (simplified - in production, use a proper library)
const calculateSunsetSunrise = (date: Date, lat: number = 48.8566, lon: number = 2.3522) => {
  // Simplified calculation - for production, use suncalc or similar
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((360 * (284 + dayOfYear) / 365) * Math.PI / 180);
  const hourAngle = Math.acos(-Math.tan(lat * Math.PI / 180) * Math.tan(declination * Math.PI / 180)) * 180 / Math.PI;
  const sunsetHour = 12 + hourAngle / 15;
  const sunriseHour = 12 - hourAngle / 15;
  
  const sunset = new Date(date);
  sunset.setHours(Math.floor(sunsetHour), Math.round((sunsetHour % 1) * 60), 0);
  
  const sunrise = new Date(date);
  sunrise.setHours(Math.floor(sunriseHour), Math.round((sunriseHour % 1) * 60), 0);
  
  return { sunset, sunrise };
};

export function WeatherWidget({
  installationId,
  installation,
  token,
  className,
}: WeatherWidgetProps) {
  const { t } = useLanguage();
  const [todayData, setTodayData] = useState<WeatherData | null>(null);
  const [tomorrowData, setTomorrowData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<string>('');

  useEffect(() => {
    const fetchWeather = async () => {
      if (!installationId || !token) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await weatherApi.getWeather(installationId, token);
        setTodayData(response.today);
        setTomorrowData(response.tomorrow);

        // Get background image based on weather condition
        const icon = response.today.icon;
        const getBackgroundImage = (icon: string) => {
          const images: Record<string, string> = {
            sun: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
            cloud: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=800&q=80',
            rain: 'https://images.unsplash.com/photo-1519692933481-e162a57d6721?w=800&q=80',
            snow: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=800&q=80',
          };
          return images[icon] || images.cloud;
        };
        setBackgroundImage(getBackgroundImage(icon));
      } catch (err) {
        console.error('Failed to fetch weather data:', err);
        if (err instanceof ApiClientError) {
          setError(err.detail);
        } else {
          setError('Failed to load weather data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [installationId, token]);

  const getLocationName = () => {
    if (!installation) return 'Location';
    const parts = [installation.city];
    if (installation.state) parts.push(installation.state);
    parts.push(installation.country);
    return parts.join(', ');
  };

  const getSunsetSunriseTime = () => {
    if (!todayData) return '';
    const now = new Date();
    const { sunset, sunrise } = calculateSunsetSunrise(now);
    const hour = now.getHours();
    
    if (hour >= sunset.getHours() || hour < sunrise.getHours()) {
      return `Sunrise at ${String(sunrise.getHours()).padStart(2, '0')}:${String(sunrise.getMinutes()).padStart(2, '0')}`;
    } else {
      return `Sunset at ${String(sunset.getHours()).padStart(2, '0')}:${String(sunset.getMinutes()).padStart(2, '0')}`;
    }
  };

  if (loading) {
    return (
      <div className={`rounded-2xl overflow-hidden relative h-full max-h-full ${className}`}>
        <div className="bg-surface/80 backdrop-blur-md p-4 h-full flex items-center justify-center">
          <div className="text-sm text-text-muted">{t('common.loading') || 'Loading...'}</div>
        </div>
      </div>
    );
  }

  if (error || !todayData) {
    return (
      <div className={`rounded-2xl overflow-hidden relative h-full max-h-full ${className}`}>
        <div className="bg-surface/80 backdrop-blur-md p-4 h-full flex items-center justify-center">
          <div className="text-sm text-critical">{error || 'Failed to load weather'}</div>
        </div>
      </div>
    );
  }

  const todayIcon = todayData.icon || 'cloud';
  const tomorrowIcon = tomorrowData?.icon || 'cloud';

  return (
    <div className={`rounded-2xl overflow-hidden relative h-full max-h-full flex flex-col ${className}`}>
      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Glassmorphism Overlay */}
      <div className="relative h-full bg-gradient-to-br from-black/60 via-black/50 to-black/60 backdrop-blur-md">
        <div className="p-2.5 h-full flex flex-col">
          {/* Today's Weather - Top Section */}
          <div className="flex-1 flex flex-col justify-between min-h-0">
            <div>
              {/* Location */}
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span className="text-white text-xs font-medium">{getLocationName()}</span>
              </div>

              {/* Temperature */}
              <div className="mb-0.5">
                <span className="text-3xl font-bold text-white">
                  {todayData.temperature}
                  <span className="text-xl align-top">°</span>
                </span>
              </div>

              {/* Time Event */}
              <div className="text-white/80 text-xs mb-2">
                {getSunsetSunriseTime()}
              </div>
            </div>

            {/* Metrics - Bottom Section */}
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-white/20">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" />
                  </svg>
                  <span className="text-white text-xs">Wind</span>
                </div>
                <div className="text-white text-xs font-semibold">
                  {todayData.wind_speed} {t('widget.kmh')}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z" />
                  </svg>
                  <span className="text-white text-xs">Humidity</span>
                </div>
                <div className="text-white text-xs font-semibold">
                  {todayData.rain_chance}%
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  <span className="text-white text-xs">UVI</span>
                </div>
                <div className="text-white text-xs font-semibold">
                  {todayIcon === 'sun' ? '4' : '1'}
                </div>
              </div>
            </div>
          </div>

          {/* Tomorrow's Forecast - Compact Section */}
          {tomorrowData && (
            <div className="mt-1.5 pt-1.5 border-t border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/80 text-xs mb-0.5">Tomorrow</div>
                  <div className="text-white text-xs font-semibold">
                    {tomorrowData.temperature}°
                  </div>
                </div>
                <div className="text-white/60 text-xs">
                  {tomorrowData.wind_speed} {t('widget.kmh')} • {tomorrowData.rain_chance}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
