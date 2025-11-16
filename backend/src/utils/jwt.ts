import jwt from 'jsonwebtoken';
import { JWTPayload } from '../types/auth.types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

export const generateAccessToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'bunty-api',
    audience: 'bunty-client'
  });
};

export const generateRefreshToken = (userId: string, email: string): string => {
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'bunty-api',
    audience: 'bunty-client'
  });
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'bunty-api',
      audience: 'bunty-client'
    }) as JWTPayload;

    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      issuer: 'bunty-api',
      audience: 'bunty-client'
    }) as JWTPayload;

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

export const getAccessTokenExpiry = (): number => {
  return 3600; // 1 hour in seconds
};
