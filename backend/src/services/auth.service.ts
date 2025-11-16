import bcrypt from 'bcrypt';
import pool from '../config/database';
import redisClient from '../config/redis';
import { User, AuthTokens } from '../types/auth.types';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, getAccessTokenExpiry } from '../utils/jwt';
import { validateEmail, validatePassword } from '../utils/validation';

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export class AuthService {
  async register(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    // Validate email
    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message || 'Invalid password');
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, email, created_at, updated_at`,
      [email.toLowerCase(), passwordHash]
    );

    const user = result.rows[0];

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      tokens
    };
  }

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    // Validate email format
    if (!validateEmail(email)) {
      throw new Error('Invalid email or password');
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      tokens
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if refresh token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new Error('Refresh token has been revoked');
    }

    // Check if refresh token exists in Redis
    const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Blacklist old refresh token
    await redisClient.setEx(`blacklist:${refreshToken}`, REFRESH_TOKEN_TTL, '1');

    // Generate new tokens
    const tokens = await this.generateTokens(decoded.userId, decoded.email);

    return tokens;
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    // Blacklist refresh token
    await redisClient.setEx(`blacklist:${refreshToken}`, REFRESH_TOKEN_TTL, '1');

    // Remove refresh token from Redis
    await redisClient.del(`refresh_token:${userId}`);

    // Remove session
    await redisClient.del(`session:${userId}`);
  }

  private async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    const accessToken = generateAccessToken(userId, email);
    const refreshToken = generateRefreshToken(userId, email);

    // Store refresh token in Redis
    await redisClient.setEx(`refresh_token:${userId}`, REFRESH_TOKEN_TTL, refreshToken);

    // Store session in Redis
    await redisClient.setEx(
      `session:${userId}`,
      3600, // 1 hour
      JSON.stringify({ userId, email, lastActivity: Date.now() })
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: getAccessTokenExpiry()
    };
  }

  async getUserById(userId: string): Promise<Omit<User, 'password_hash'> | null> {
    const result = await pool.query(
      'SELECT id, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}
