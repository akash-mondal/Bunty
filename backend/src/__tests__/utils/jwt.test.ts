/**
 * Unit tests for JWT token generation and validation
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getAccessTokenExpiry,
} from '../../utils/jwt';

describe('JWT Utilities', () => {
  const testUserId = 'test-user-123';
  const testEmail = 'test@example.com';

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId and email in token payload', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.type).toBe('access');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include userId and email in token payload', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
      expect(decoded.type).toBe('refresh');
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify a valid access token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyAccessToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw error for refresh token used as access token', () => {
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      expect(() => {
        verifyAccessToken(refreshToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify a valid refresh token', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyRefreshToken('invalid-token');
      }).toThrow('Invalid or expired refresh token');
    });

    it('should throw error for access token used as refresh token', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      
      expect(() => {
        verifyRefreshToken(accessToken);
      }).toThrow();
    });
  });

  describe('getAccessTokenExpiry', () => {
    it('should return expiry time in seconds', () => {
      const expiry = getAccessTokenExpiry();
      
      expect(expiry).toBe(3600); // 1 hour
    });
  });

  describe('Token structure validation', () => {
    it('should generate tokens with three parts (header.payload.signature)', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      expect(accessToken.split('.')).toHaveLength(3);
      expect(refreshToken.split('.')).toHaveLength(3);
    });

    it('should include standard JWT claims', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyAccessToken(token);
      
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded).toHaveProperty('type');
    });
  });

  describe('Token expiration', () => {
    it('should validate access token expiry is set', () => {
      const expiry = getAccessTokenExpiry();
      
      expect(expiry).toBe(3600); // 1 hour in seconds
      expect(expiry).toBeGreaterThan(0);
    });

    it('should generate valid tokens that can be verified', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      // Both tokens should be verifiable immediately after generation
      expect(() => verifyAccessToken(accessToken)).not.toThrow();
      expect(() => verifyRefreshToken(refreshToken)).not.toThrow();
    });
  });

  describe('Token type enforcement', () => {
    it('should enforce access token type', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.type).toBe('access');
    });

    it('should enforce refresh token type', () => {
      const token = generateRefreshToken(testUserId, testEmail);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded.type).toBe('refresh');
    });

    it('should reject mismatched token types', () => {
      const accessToken = generateAccessToken(testUserId, testEmail);
      const refreshToken = generateRefreshToken(testUserId, testEmail);
      
      expect(() => verifyRefreshToken(accessToken)).toThrow();
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });
  });

  describe('Token payload integrity', () => {
    it('should preserve userId and email in token', () => {
      const token = generateAccessToken(testUserId, testEmail);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.email).toBe(testEmail);
    });

    it('should handle different user IDs', () => {
      const userId1 = 'user-123';
      const userId2 = 'user-456';
      
      const token1 = generateAccessToken(userId1, 'user1@example.com');
      const token2 = generateAccessToken(userId2, 'user2@example.com');
      
      const decoded1 = verifyAccessToken(token1);
      const decoded2 = verifyAccessToken(token2);
      
      expect(decoded1.userId).toBe(userId1);
      expect(decoded2.userId).toBe(userId2);
      expect(decoded1.userId).not.toBe(decoded2.userId);
    });
  });

  describe('Error handling', () => {
    it('should throw descriptive error for invalid token format', () => {
      expect(() => {
        verifyAccessToken('not-a-valid-token');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw descriptive error for malformed JWT', () => {
      expect(() => {
        verifyAccessToken('header.payload');
      }).toThrow('Invalid or expired access token');
    });

    it('should throw error for empty token', () => {
      expect(() => {
        verifyAccessToken('');
      }).toThrow('Invalid or expired access token');
    });
  });
});
