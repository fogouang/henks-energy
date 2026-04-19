'use client';

/**
 * Authentication Context
 * Manages user authentication state, login, logout, and token storage
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, ApiClientError } from '@/lib/api/client';

interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'jsenergy_access_token';
const REFRESH_TOKEN_KEY = 'jsenergy_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (authToken?: string) => {
    const tokenToUse = authToken || token;
    if (!tokenToUse) {
      setIsLoading(false);
      return;
    }

    try {
      const userData = await authApi.getCurrentUser(tokenToUse);
      setUser(userData);
      setIsLoading(false);
    } catch (error) {
      // Only log and throw if it's not a 401 (handled by caller)
      if (error instanceof ApiClientError && error.status === 401) {
        // Don't log 401 errors - they're expected when token is expired
        setIsLoading(false);
        throw error;
      }
      // Only log unexpected errors (not authentication-related)
      if (!(error instanceof ApiClientError && (error.status === 401 || error.status === 403))) {
        console.error('Failed to fetch user:', error);
      }
      // Clear invalid token for other errors
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setToken(null);
      setUser(null);
      setIsLoading(false);
      throw error;
    }
  }, [token]);

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (storedToken) {
      setToken(storedToken);
      // Try to fetch user info
      refreshUser(storedToken).catch(async (error) => {
        // If token is invalid, try to refresh it
        if (error instanceof ApiClientError && error.status === 401 && storedRefreshToken) {
          try {
            const response = await authApi.refresh(storedRefreshToken);
            localStorage.setItem(TOKEN_KEY, response.access_token);
            if (response.refresh_token) {
              localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
            }
            setToken(response.access_token);
            await refreshUser(response.access_token);
            return;
          } catch (refreshError) {
            // Refresh failed - this is expected if refresh token is expired
            // Only log if it's not a 401/403 (authentication error)
            if (!(refreshError instanceof ApiClientError && (refreshError.status === 401 || refreshError.status === 403))) {
              console.error('Token refresh failed:', refreshError);
            }
          }
        }
        // If token is invalid and refresh failed, clear it silently
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setToken(null);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      
      // Store tokens
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
      
      setToken(response.access_token);
      
      // Fetch user info
      await refreshUser(response.access_token);
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      throw new Error('Login failed');
    }
  }, [refreshUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        refreshUser: async () => {
          try {
            await refreshUser();
          } catch (error) {
            // If refresh fails, try to refresh token
            if (error instanceof ApiClientError && error.status === 401) {
              const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
              if (storedRefreshToken) {
                try {
                  const response = await authApi.refresh(storedRefreshToken);
                  localStorage.setItem(TOKEN_KEY, response.access_token);
                  if (response.refresh_token) {
                    localStorage.setItem(REFRESH_TOKEN_KEY, response.refresh_token);
                  }
                  setToken(response.access_token);
                  await refreshUser(response.access_token);
                  return;
                } catch (refreshError) {
                  // Refresh failed - logout user silently if it's an auth error
                  if (refreshError instanceof ApiClientError && (refreshError.status === 401 || refreshError.status === 403)) {
                    logout();
                    // Don't throw - user will be redirected to login
                    return;
                  }
                  // For other errors, log and throw
                  console.error('Token refresh failed:', refreshError);
                  logout();
                  throw refreshError;
                }
              }
            }
            throw error;
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

