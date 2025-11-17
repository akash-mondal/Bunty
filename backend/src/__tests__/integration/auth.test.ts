/**
 * Integration tests for authentication endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../config/database';

const app = createTestApp();

describe('Authentication API Integration', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!';
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Ensure database connection
    await pool.query('SELECT 1');
  });

  describe('POST /api/auth/register', () => {
    it('should reject registration without email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: testPassword });

      expect(response.status).toBe(400);
    });

    it('should reject registration without password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail });

      expect(response.status).toBe(400);
    });

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'invalid-email', password: testPassword });

      expect(response.status).toBe(400);
    });

    it('should successfully register a new user', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.user.id).toBeDefined();
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBe(3600);

      // Store tokens for later tests
      accessToken = response.body.tokens.accessToken;
      refreshToken = response.body.tokens.refreshToken;
    });

    it('should reject duplicate email registration', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject login without email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ password: testPassword });

      expect(response.status).toBe(400);
    });

    it('should reject login without password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail });

      expect(response.status).toBe(400);
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword123!' });

      expect(response.status).toBe(401);
    });

    it('should successfully login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: testPassword });

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });

    it('should successfully refresh tokens', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.tokens).toBeDefined();
      expect(response.body.tokens.accessToken).toBeDefined();
      expect(response.body.tokens.refreshToken).toBeDefined();
      expect(response.body.tokens.expiresIn).toBe(3600);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testEmail);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should reject logout without auth token', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });

    it('should successfully logout with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBeDefined();
    });
  });
});
