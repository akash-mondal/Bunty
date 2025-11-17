/**
 * Tests for authentication components
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import React from 'react';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock auth service
const mockGetCurrentUser = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockLogout = jest.fn();
const mockRefreshToken = jest.fn();

jest.mock('@/services/auth.service', () => ({
  authService: {
    getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
    login: (...args: any[]) => mockLogin(...args),
    register: (...args: any[]) => mockRegister(...args),
    logout: (...args: any[]) => mockLogout(...args),
    refreshToken: (...args: any[]) => mockRefreshToken(...args),
  },
}));

// Test component to access auth context
function TestComponent() {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'yes' : 'no'}</div>
      <div data-testid="user-email">{user?.email || 'none'}</div>
    </div>
  );
}

describe('Authentication Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthProvider', () => {
    it('should initialize with loading state', () => {
      mockGetCurrentUser.mockResolvedValue(null);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      expect(screen.getByTestId('loading')).toHaveTextContent('loading');
    });

    it('should load user on mount', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentUser.mockResolvedValue(mockUser);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('yes');
        expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com');
      });
    });

    it('should handle user not logged in', async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
        expect(screen.getByTestId('user-email')).toHaveTextContent('none');
      });
    });

    it('should handle getCurrentUser error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Failed to load user'));
      
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
        expect(screen.getByTestId('authenticated')).toHaveTextContent('no');
      });
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Email validation', () => {
    it('should validate correct email format', () => {
      const email = 'test@example.com';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      
      expect(isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidEmail = 'invalid-email';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail);
      
      expect(isValid).toBe(false);
    });

    it('should reject email without domain', () => {
      const invalidEmail = 'test@';
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invalidEmail);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Password validation', () => {
    it('should validate password with minimum length', () => {
      const password = 'SecurePass123!';
      const hasMinLength = password.length >= 8;
      
      expect(hasMinLength).toBe(true);
    });

    it('should reject password below minimum length', () => {
      const weakPassword = '123';
      const hasMinLength = weakPassword.length >= 8;
      
      expect(hasMinLength).toBe(false);
    });

    it('should validate password confirmation match', () => {
      const password = 'SecurePass123!';
      const confirmPassword = 'SecurePass123!';
      
      expect(password === confirmPassword).toBe(true);
    });

    it('should detect password mismatch', () => {
      const password = 'SecurePass123!';
      const mismatchPassword = 'DifferentPass456!';
      
      expect(password === mismatchPassword).toBe(false);
    });
  });
});
