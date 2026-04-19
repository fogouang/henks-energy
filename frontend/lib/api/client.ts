/**
 * API Client for JSEnergy Dashboard
 * Typed client for backend API communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
  status: number;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public detail: string,
    message?: string
  ) {
    super(message || detail);
    this.name = 'ApiClientError';
  }
}

/**
 * Base fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // Endpoint should already include /api prefix, so don't add it again
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        // Handle Pydantic validation errors (array format)
        if (Array.isArray(errorData.detail)) {
          detail = errorData.detail.map((err: any) => err.msg || JSON.stringify(err)).join('; ');
        } else if (typeof errorData.detail === 'string') {
          detail = errorData.detail;
        } else {
          detail = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        detail = errorData.message;
      }
    } catch {
      // If response is not JSON, use status text
    }
    throw new ApiClientError(response.status, detail);
  }

  // Handle 204 No Content responses (DELETE operations typically return this)
  if (response.status === 204) {
    return {} as T;
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      // If JSON parsing fails, return empty object
      return {} as T;
    }
  }
  
  return {} as T;
}

/**
 * Authentication API
 */
export const authApi = {
  async login(email: string, password: string) {
    return apiFetch<{ access_token: string; refresh_token: string; token_type: string }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }
    );
  },

  async refresh(refreshToken: string) {
    return apiFetch<{ access_token: string; refresh_token: string; token_type: string; expires_in: number }>(
      '/api/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken }),
      }
    );
  },

  async getCurrentUser(token: string) {
    return apiFetch<any>(
      '/api/auth/me',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Installations API
 */
export interface Installation {
  id: number;
  name: string;
  country: string;
  state?: string | null;
  city: string;
  timezone: string;
  has_pv: boolean;
  has_battery: boolean;
  has_generator: boolean;
  has_ev_chargers: boolean;
  inverter_count: number;
  charger_count: number;
  created_at: string;
  updated_at: string;
  owner_email?: string | null; // Owner email (admin only)
}

export interface InstallationCreate {
  name: string;
  country: string;
  state?: string | null;
  city: string;
  user_id: number; // Required: user who owns this installation
  timezone?: string;
  has_pv?: boolean;
  has_battery?: boolean;
  has_generator?: boolean;
  has_ev_chargers?: boolean;
  inverter_count?: number;
  charger_count?: number;
}

export interface InstallationUpdate {
  name?: string;
  country?: string;
  state?: string | null;
  city?: string;
  timezone?: string;
  has_pv?: boolean;
  has_battery?: boolean;
  has_generator?: boolean;
  has_ev_chargers?: boolean;
  inverter_count?: number;
  charger_count?: number;
}

export interface InverterComponentItem {
  inverter_number: number;
  has_measurements: boolean;
}

export interface ChargerComponentItem {
  charger_number: number;
  has_measurements: boolean;
}

export interface InstallationComponentData {
  inverters: InverterComponentItem[];
  chargers: ChargerComponentItem[];
}

export const installationsApi = {
  async getInstallations(token: string) {
    return apiFetch<{ installations: Installation[]; total: number }>(
      `/api/installations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getInstallation(id: number, token: string) {
    return apiFetch<Installation>(
      `/api/installations/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getInstallationComponentData(installationId: number, token: string) {
    return apiFetch<InstallationComponentData>(
      `/api/installations/${installationId}/component-data`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getUserInstallations(userId: number, token: string) {
    return apiFetch<{ installations: Installation[]; total: number }>(
      `/api/users/${userId}/installations`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async createInstallation(data: InstallationCreate, token: string) {
    return apiFetch<Installation>(
      `/api/installations`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async updateInstallation(id: number, data: InstallationUpdate, token: string) {
    return apiFetch<Installation>(
      `/api/installations/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async activateInstallation(id: number, token: string) {
    return apiFetch<Installation>(
      `/api/installations/${id}/activate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deactivateInstallation(id: number, token: string) {
    return apiFetch<Installation>(
      `/api/installations/${id}/deactivate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deleteInstallation(id: number, token: string) {
    return apiFetch<void>(
      `/api/installations/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getLiveData(id: number, token: string) {
    return apiFetch<any>(
      `/api/installations/${id}/live`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Measurements API
 */
export const measurementsApi = {
  async getHistory(
    installationId: number,
    params: {
      start?: string;
      end?: string;
      component?: string;
      interval?: string;
    },
    token: string
  ) {
    const queryParams = new URLSearchParams();
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.component) queryParams.set('component', params.component);
    if (params.interval) queryParams.set('interval', params.interval);

    return apiFetch<any>(
      `/api/installations/${installationId}/history?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * EPEX API
 */
export const epexApi = {
  async getPrices(params: { start?: string; end?: string; region?: string }, token: string) {
    const queryParams = new URLSearchParams();
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.region) queryParams.set('region', params.region);

    return apiFetch<any>(
      `/api/epex/prices?${queryParams.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getForecast(token: string) {
    return apiFetch<any>(
      '/api/epex/prices/forecast',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Edge Device API
 */
export interface EdgeDevice {
  id: number;
  device_id: number;
  installation_id: number;
  name: string;
  token?: string; // Only present in create/regenerate responses
  description: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  reverse_ssh_enabled: boolean | null; // null if no ReverseSSH config exists
}

export interface EdgeDeviceCreate {
  name: string;
  installation_id: number;
  description?: string | null;
}

export interface EdgeDeviceUpdate {
  name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface EdgeDeviceList {
  devices: Omit<EdgeDevice, 'token'>[];
  total: number;
}

export const edgeDevicesApi = {
  async getDevices(installationId: number, token: string) {
    return apiFetch<EdgeDeviceList>(
      `/api/installations/${installationId}/edge-devices`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async createDevice(installationId: number, data: EdgeDeviceCreate, token: string) {
    return apiFetch<EdgeDevice>(
      `/api/installations/${installationId}/edge-devices`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getDevice(installationId: number, deviceId: number, token: string) {
    return apiFetch<Omit<EdgeDevice, 'token'>>(
      `/api/installations/${installationId}/edge-devices/${deviceId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async updateDevice(installationId: number, deviceId: number, data: EdgeDeviceUpdate, token: string) {
    return apiFetch<Omit<EdgeDevice, 'token'>>(
      `/api/installations/${installationId}/edge-devices/${deviceId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deleteDevice(installationId: number, deviceId: number, token: string) {
    return apiFetch<void>(
      `/api/installations/${installationId}/edge-devices/${deviceId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async regenerateToken(installationId: number, deviceId: number, token: string) {
    return apiFetch<EdgeDevice>(
      `/api/installations/${installationId}/edge-devices/${deviceId}/regenerate-token`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async activateDevice(installationId: number, deviceId: number, token: string) {
    return apiFetch<Omit<EdgeDevice, 'token'>>(
      `/api/installations/${installationId}/edge-devices/${deviceId}/activate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deactivateDevice(installationId: number, deviceId: number, token: string) {
    return apiFetch<Omit<EdgeDevice, 'token'>>(
      `/api/installations/${installationId}/edge-devices/${deviceId}/deactivate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async toggleReverseSSH(installationId: number, deviceId: number, enabled: boolean, token: string) {
    return apiFetch<Omit<EdgeDevice, 'token'>>(
      `/api/installations/${installationId}/edge-devices/${deviceId}/reverse-ssh/toggle?enabled=${enabled}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Weather API
 */
export interface WeatherData {
  temperature: number;
  wind_speed: number;
  wind_direction: string;
  rain_chance: number;
  icon: 'cloud' | 'sun' | 'rain' | 'snow';
  date: string;
}

export interface WeatherResponse {
  today: WeatherData;
  tomorrow: WeatherData;
}

export const weatherApi = {
  async getWeather(installationId: number, token: string) {
    return apiFetch<WeatherResponse>(
      `/api/installations/${installationId}/weather`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Location Data API
 */
export interface Country {
  code: string;
  name: string;
}

export interface State {
  code: string;
  name: string;
}

export interface City {
  name: string;
}

export const locationApi = {
  async getCountries(token: string) {
    return apiFetch<{ countries: Country[] }>(
      `/api/installations/location/countries`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getStates(countryCode: string, token: string) {
    return apiFetch<{ states: State[] }>(
      `/api/installations/location/states?country_code=${encodeURIComponent(countryCode)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getCities(countryCode: string, stateCode: string | null, token: string) {
    const params = new URLSearchParams({ country_code: countryCode });
    if (stateCode) {
      params.append('state_code', stateCode);
    }
    return apiFetch<{ cities: City[] }>(
      `/api/installations/location/cities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * User Management API (Admin only)
 */
export interface User {
  id: number;
  email: string;
  role: 'admin' | 'customer';
  is_active: boolean;
  full_name: string | null;
  phone: string | null;
  language_preference: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface UserCreate {
  email: string;
  password?: string;
  role?: 'admin' | 'customer';
  is_active?: boolean;
  full_name?: string | null;
  phone?: string | null;
  language_preference?: string;
}

export interface UserUpdate {
  email?: string;
  role?: 'admin' | 'customer';
  is_active?: boolean;
  full_name?: string | null;
  phone?: string | null;
  language_preference?: string;
  password?: string; // New password (min 12 characters)
}

export interface UserCredentials {
  email: string;
  password: string;
  message: string;
}

export interface UserList {
  users: User[];
  total: number;
}

export const usersApi = {
  async getUsers(
    token: string,
    options?: { role?: 'admin' | 'customer'; is_active?: boolean; include_deleted?: boolean }
  ) {
    const params = new URLSearchParams();
    if (options?.role) params.set('role', options.role);
    if (options?.is_active !== undefined) params.set('is_active', String(options.is_active));
    if (options?.include_deleted) params.set('include_deleted', 'true');

    return apiFetch<UserList>(
      `/api/users?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async createUser(data: UserCreate, token: string) {
    return apiFetch<UserCredentials>(
      `/api/users`,
      {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async getUser(userId: number, token: string) {
    return apiFetch<User>(
      `/api/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async updateUser(userId: number, data: UserUpdate, token: string) {
    return apiFetch<User>(
      `/api/users/${userId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async activateUser(userId: number, token: string) {
    return apiFetch<User>(
      `/api/users/${userId}/activate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deactivateUser(userId: number, token: string) {
    return apiFetch<User>(
      `/api/users/${userId}/deactivate`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deleteUser(userId: number, token: string) {
    return apiFetch<void>(
      `/api/users/${userId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

/**
 * Firmware Management API (Admin only)
 */
export interface Firmware {
  id: number;
  version: string;
  build_number: number;
  filename: string;
  file_size: number;
  checksum: string;
  release_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FirmwareListItem {
  id: number;
  version: string;
  build_number: number;
  filename: string;
  file_size: number;
  created_at: string;
}

export interface FirmwareList {
  firmware: FirmwareListItem[];
  total: number;
}

/**
 * System Settings API (Admin only)
 */
export interface ReverseSSHSettings {
  host: string;
  user: string;
  port: number;
}

export const systemSettingsApi = {
  async getReverseSSHSettings(token: string) {
    return apiFetch<ReverseSSHSettings>(
      `/api/system-settings/reverse-ssh`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async updateReverseSSHSettings(data: ReverseSSHSettings, token: string) {
    return apiFetch<ReverseSSHSettings>(
      `/api/system-settings/reverse-ssh`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

export const firmwareApi = {
  async listFirmware(token: string) {
    return apiFetch<FirmwareList>(
      `/api/firmware`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async uploadFirmware(
    file: File,
    version: string,
    buildNumber: number,
    releaseNotes: string | null,
    token: string
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('version', version);
    formData.append('build_number', buildNumber.toString());
    if (releaseNotes) {
      formData.append('release_notes', releaseNotes);
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/api/firmware`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Don't set Content-Type - browser will set it with boundary for multipart/form-data
      },
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      let detail = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          detail = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
        }
      } catch {
        // If response is not JSON, use status text
      }
      throw new ApiClientError(response.status, detail);
    }

    return response.json() as Promise<Firmware>;
  },

  async getFirmware(firmwareId: number, token: string) {
    return apiFetch<Firmware>(
      `/api/firmware/${firmwareId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },

  async deleteFirmware(firmwareId: number, token: string) {
    return apiFetch<void>(
      `/api/firmware/${firmwareId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  },
};

