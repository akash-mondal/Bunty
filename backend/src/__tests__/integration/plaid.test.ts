/**
 * Integration tests for Plaid endpoints
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../config/database';

const app = createTestApp();

describe('Plaid API Integration', () => {
  let accessToken: string;
  const testEmail = `plaid-test-${Date.now()}@example.com`;
  const testPassword = 'SecurePass123!';

  beforeAll(async () => {
    // Ensure database connection
    await pool.query('SELECT 1');

    // Register and login to get access token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    accessToken = registerResponse.body.tokens.accessToken;
  });

  describe('POST /api/plaid/create-link-token', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/plaid/create-link-token');

      expect(response.status).toBe(401);
    });

    it('should return link token with authentication', async () => {
      const response = await request(app)
        .post('/api/plaid/create-link-token')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.linkToken).toBeDefined();
      expect(typeof response.body.linkToken).toBe('string');
    });
  });

  describe('POST /api/plaid/exchange', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/plaid/exchange')
        .send({ publicToken: 'public-sandbox-token' });

      expect(response.status).toBe(401);
    });

    it('should reject request without public token', async () => {
      const response = await request(app)
        .post('/api/plaid/exchange')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should validate public token format', async () => {
      const response = await request(app)
        .post('/api/plaid/exchange')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ publicToken: 'invalid-token' });

      // Should fail with either 400 (validation) or 500 (Plaid API error)
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('GET /api/plaid/income', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/plaid/income');

      expect(response.status).toBe(401);
    });

    it('should return 404 when no Plaid connection exists', async () => {
      const response = await request(app)
        .get('/api/plaid/income')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/plaid/assets', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/plaid/assets');

      expect(response.status).toBe(401);
    });

    it('should return 404 when no Plaid connection exists', async () => {
      const response = await request(app)
        .get('/api/plaid/assets')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/plaid/liabilities', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/plaid/liabilities');

      expect(response.status).toBe(401);
    });

    it('should return 404 when no Plaid connection exists', async () => {
      const response = await request(app)
        .get('/api/plaid/liabilities')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/plaid/signal', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/plaid/signal');

      expect(response.status).toBe(401);
    });

    it('should return 404 when no Plaid connection exists', async () => {
      const response = await request(app)
        .get('/api/plaid/signal')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/plaid/connections', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/plaid/connections');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no connections exist', async () => {
      const response = await request(app)
        .get('/api/plaid/connections')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.connections)).toBe(true);
    });
  });
});
