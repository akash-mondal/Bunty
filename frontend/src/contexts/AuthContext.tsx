'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { User, AuthContextType, LoginCredentials, RegisterCredentials } from '@/types/auth.types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Setup automatic token refresh
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(
      async () => {
        try {
          await authService.refreshToken();
        } catch (error) {
          console.error('Token refresh failed:', error);
          setUser(null);
          router.push('/login');
        }
      },
      50 * 60 * 1000 // Refresh every 50 minutes (tokens expire in 1 hour)
    );

    return () => clearInterval(refreshInterval);
  }, [user, router]);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const { user: loggedInUser } = await authService.login(credentials);
        setUser(loggedInUser);
        router.push('/dashboard');
      } catch (error: any) {
        throw new Error(error.response?.data?.error?.message || 'Login failed');
      }
    },
    [router]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      if (credentials.password !== credentials.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      try {
        const { user: registeredUser } = await authService.register(credentials);
        setUser(registeredUser);
        router.push('/dashboard');
      } catch (error: any) {
        throw new Error(error.response?.data?.error?.message || 'Registration failed');
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [router]);

  const refreshToken = useCallback(async () => {
    try {
      await authService.refreshToken();
    } catch (error) {
      console.error('Token refresh failed:', error);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
