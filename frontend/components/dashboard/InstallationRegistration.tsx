'use client';

/**
 * Installation Registration Component
 * Form to create a new installation
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Installation,
  InstallationCreate,
  InstallationComponentData,
  InstallationUpdate,
  installationsApi,
  ApiClientError,
  locationApi,
  Country,
} from '@/lib/api/client';
import { useAuth } from '@/contexts/AuthContext';

interface InstallationRegistrationProps {
  userId: number; // Required: user who will own this installation (used for create)
  installation?: Installation | null; // When set, edit mode with prefilled data
  onClose: () => void;
  onSuccess: (installation: Installation) => void;
}

const isEditMode = (installation: Installation | null | undefined): installation is Installation =>
  Boolean(installation?.id);

export function InstallationRegistration({ userId, installation, onClose, onSuccess }: InstallationRegistrationProps) {
  const { t } = useLanguage();
  const { token } = useAuth();
  const editMode = isEditMode(installation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [componentData, setComponentData] = useState<InstallationComponentData | null>(null);
  const [formData, setFormData] = useState<InstallationCreate>({
    name: '',
    country: '',
    state: null,
    city: '',
    user_id: userId,
    timezone: 'Europe/Amsterdam',
    has_pv: true,
    has_battery: true,
    has_generator: false,
    has_ev_chargers: false,
    inverter_count: 1,
    charger_count: 0,
  });

  // Location data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Edit mode: prefill form and load component data
  useEffect(() => {
    if (!editMode || !installation) return;
    setFormData({
      name: installation.name,
      country: installation.country,
      state: installation.state ?? null,
      city: installation.city,
      user_id: userId,
      timezone: installation.timezone,
      has_pv: installation.has_pv,
      has_battery: installation.has_battery,
      has_generator: installation.has_generator,
      has_ev_chargers: installation.has_ev_chargers,
      inverter_count: installation.inverter_count,
      charger_count: installation.charger_count,
    });
  }, [editMode, installation, userId]);

  useEffect(() => {
    if (!editMode || !installation?.id || !token) return;
    const load = async () => {
      try {
        const data = await installationsApi.getInstallationComponentData(installation.id, token);
        setComponentData(data);
      } catch (err) {
        console.error('Failed to load component data:', err);
      }
    };
    load();
  }, [editMode, installation?.id, token]);

  // Map country codes to timezones
  const getTimezoneForCountry = (countryCode: string): string => {
    const timezoneMap: Record<string, string> = {
      // Europe
      'NL': 'Europe/Amsterdam',
      'BE': 'Europe/Brussels',
      'DE': 'Europe/Berlin',
      'FR': 'Europe/Paris',
      'GB': 'Europe/London',
      'ES': 'Europe/Madrid',
      'IT': 'Europe/Rome',
      'PL': 'Europe/Warsaw',
      'PT': 'Europe/Lisbon',
      'GR': 'Europe/Athens',
      'AT': 'Europe/Vienna',
      'CH': 'Europe/Zurich',
      'SE': 'Europe/Stockholm',
      'NO': 'Europe/Oslo',
      'DK': 'Europe/Copenhagen',
      'FI': 'Europe/Helsinki',
      'IE': 'Europe/Dublin',
      'CZ': 'Europe/Prague',
      'HU': 'Europe/Budapest',
      'RO': 'Europe/Bucharest',
      'BG': 'Europe/Sofia',
      'HR': 'Europe/Zagreb',
      'SK': 'Europe/Bratislava',
      'SI': 'Europe/Ljubljana',
      'EE': 'Europe/Tallinn',
      'LV': 'Europe/Riga',
      'LT': 'Europe/Vilnius',
      
      // North America
      'US': 'America/New_York', // Default to Eastern, most common
      'CA': 'America/Toronto',
      'MX': 'America/Mexico_City',
      
      // Asia
      'CN': 'Asia/Shanghai',
      'JP': 'Asia/Tokyo',
      'KR': 'Asia/Seoul',
      'IN': 'Asia/Kolkata',
      'SG': 'Asia/Singapore',
      'MY': 'Asia/Kuala_Lumpur',
      'TH': 'Asia/Bangkok',
      'VN': 'Asia/Ho_Chi_Minh',
      'PH': 'Asia/Manila',
      'ID': 'Asia/Jakarta',
      'AU': 'Australia/Sydney',
      'NZ': 'Pacific/Auckland',
      
      // Middle East
      'AE': 'Asia/Dubai',
      'SA': 'Asia/Riyadh',
      'IL': 'Asia/Jerusalem',
      'TR': 'Europe/Istanbul',
      
      // South America
      'BR': 'America/Sao_Paulo',
      'AR': 'America/Argentina/Buenos_Aires',
      'CL': 'America/Santiago',
      'CO': 'America/Bogota',
      'PE': 'America/Lima',
      
      // Africa
      'ZA': 'Africa/Johannesburg',
      'EG': 'Africa/Cairo',
      'KE': 'Africa/Nairobi',
      'NG': 'Africa/Lagos',
    };
    
    return timezoneMap[countryCode.toUpperCase()] || 'UTC';
  };

  // Load countries on mount
  useEffect(() => {
    if (!token) return;
    const loadCountries = async () => {
      try {
        setLoadingCountries(true);
        const response = await locationApi.getCountries(token);
        setCountries(response.countries);
      } catch (err) {
        console.error('Failed to load countries:', err);
      } finally {
        setLoadingCountries(false);
      }
    };
    loadCountries();
  }, [token]);

  // Auto-set timezone when country changes (create mode only; edit mode keeps installation timezone)
  useEffect(() => {
    if (editMode || !formData.country) return;
    const timezone = getTimezoneForCountry(formData.country);
    setFormData((prev) => ({ ...prev, timezone }));
  }, [editMode, formData.country]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (editMode && installation) {
      const newInvCount = formData.inverter_count ?? 1;
      const newChCount = formData.charger_count ?? 0;
      const origInvCount = installation.inverter_count;
      const origChCount = installation.charger_count;

      // Data-loss warning: inverters
      if (newInvCount < origInvCount && componentData) {
        const removedNumbers = componentData.inverters
          .filter((inv) => inv.inverter_number > newInvCount)
          .map((inv) => inv.inverter_number);
        const withData = removedNumbers.filter((num) => {
          const item = componentData.inverters.find((i) => i.inverter_number === num);
          return item?.has_measurements;
        });
        if (withData.length > 0) {
          const numbersList = withData.sort((a, b) => a - b).join(', ');
          const msg =
            t('installations.confirmDecreaseInverters')?.replace('{{numbers}}', numbersList) ||
            `Decreasing the number of inverters will permanently remove inverter(s) ${numbersList} and all their historical data. This cannot be undone. Continue?`;
          if (!window.confirm(msg)) return;
        }
      }

      // Data-loss warning: chargers
      if (formData.has_ev_chargers && newChCount < origChCount && componentData) {
        const removedNumbers = componentData.chargers
          .filter((ch) => ch.charger_number > newChCount)
          .map((ch) => ch.charger_number);
        const withData = removedNumbers.filter((num) => {
          const item = componentData.chargers.find((c) => c.charger_number === num);
          return item?.has_measurements;
        });
        if (withData.length > 0) {
          const numbersList = withData.sort((a, b) => a - b).join(', ');
          const msg =
            t('installations.confirmDecreaseChargers')?.replace('{{numbers}}', numbersList) ||
            `Decreasing the number of chargers will permanently remove charger(s) ${numbersList} and all their historical data. This cannot be undone. Continue?`;
          if (!window.confirm(msg)) return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const payload: InstallationUpdate = {
          name: formData.name,
          country: formData.country,
          state: formData.state,
          city: formData.city,
          timezone: formData.timezone,
          has_pv: formData.has_pv,
          has_battery: formData.has_battery,
          has_generator: formData.has_generator,
          has_ev_chargers: formData.has_ev_chargers,
          inverter_count: formData.inverter_count,
          charger_count: formData.charger_count,
        };
        const updated = await installationsApi.updateInstallation(installation.id, payload, token);
        onSuccess(updated);
        onClose();
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.detail);
        } else {
          setError(t('installations.registrationError') || 'Failed to update installation');
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const created = await installationsApi.createInstallation(formData, token);
      onSuccess(created);
      onClose();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.detail);
      } else {
        setError(t('installations.registrationError') || 'Failed to create installation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="card shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-text">
          {editMode
            ? (t('installations.editInstallation') || 'Edit Installation')
            : (t('installations.createInstallation') || 'Create New Installation')}
        </h2>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-critical/20 border border-critical/50 text-critical">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('installations.name') || 'Installation Name'} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder={t('installations.namePlaceholder') || 'e.g., Office Building A'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('installations.country') || 'Country'} *
              </label>
              <select
                required
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                disabled={loadingCountries}
              >
                <option value="">{loadingCountries ? (t('common.loading') || 'Loading...') : (t('installations.selectCountry') || 'Select Country')}</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('installations.state') || 'State/Province'}
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value || null })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder={t('installations.statePlaceholder') || 'e.g., California, North Holland (Optional)'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-text">
                {t('installations.city') || 'City'} *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                placeholder={t('installations.cityPlaceholder') || 'e.g., Amsterdam, New York'}
              />
            </div>


            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_pv}
                    onChange={(e) => setFormData({ ...formData, has_pv: e.target.checked })}
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">
                    {t('installations.hasPv') || 'Has PV'}
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_battery}
                    onChange={(e) => setFormData({ ...formData, has_battery: e.target.checked })}
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">
                    {t('installations.hasBattery') || 'Has Battery'}
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_generator}
                    onChange={(e) => setFormData({ ...formData, has_generator: e.target.checked })}
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">
                    {t('installations.hasGenerator') || 'Has Generator'}
                  </span>
                </label>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.has_ev_chargers}
                    onChange={(e) => setFormData({ ...formData, has_ev_chargers: e.target.checked })}
                    className="accent-accent-1"
                  />
                  <span className="text-sm text-text">
                    {t('installations.hasEvChargers') || 'Has EV Chargers'}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-text">
                  {t('installations.inverterCount') || 'Inverter Count'} (1-8)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.inverter_count}
                  onChange={(e) => setFormData({ ...formData, inverter_count: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                />
              </div>
              {formData.has_ev_chargers && (
                <div>
                  <label className="block text-sm font-medium mb-1 text-text">
                    {t('installations.chargerCount') || 'Charger Count'} (0-4)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={formData.charger_count}
                    onChange={(e) => setFormData({ ...formData, charger_count: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent-1"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.country || !formData.city}
              className="flex-1 px-4 py-2 rounded-md transition-colors font-medium bg-accent-1 text-white hover:bg-accent-1/90 disabled:opacity-50"
            >
              {loading
                ? (t('common.loading') || 'Loading...')
                : editMode
                  ? (t('common.save') || 'Save')
                  : (t('installations.create') || 'Create')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md transition-colors bg-border text-text hover:bg-border/80"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

