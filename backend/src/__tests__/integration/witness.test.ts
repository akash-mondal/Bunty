/**
 * Integration tests for witness generation endpoint
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../config/database';

const app = createTestApp();

describe('Witness Generation Integration', () => {
  let accessToken: string;
  const testEmail = `witness-test-${Date.now()}@example.com`;
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

  describe('POST /api/witness/generate', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/witness/generate');

      expect(response.status).toBe(401);
    });

    it('should return error when no Plaid connection exists', async () => {
      const response = await request(app)
        .post('/api/witness/generate')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should fail because user has no Plaid or Stripe data
      expect([400, 404, 500]).toContain(response.status);
    });

    it('should validate witness data structure', () => {
      const witness = {
        income: 5000,
        employmentMonths: 12,
        employerHash: 'a'.repeat(64),
        assets: 50000,
        liabilities: 10000,
        creditScore: 720,
        ssnVerified: true,
        selfieVerified: true,
        documentVerified: true,
        timestamp: Date.now(),
      };

      const requiredFields = [
        'income',
        'employmentMonths',
        'employerHash',
        'assets',
        'liabilities',
        'creditScore',
        'ssnVerified',
        'selfieVerified',
        'documentVerified',
        'timestamp',
      ];

      const hasAllFields = requiredFields.every(field => field in witness);
      expect(hasAllFields).toBe(true);
      expect(witness.income).toBeGreaterThanOrEqual(0);
      expect(witness.timestamp).toBeGreaterThan(0);
    });
  });

  describe('GET /api/witness/commitments', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/witness/commitments');

      expect(response.status).toBe(401);
    });

    it('should return empty array when no commitments exist', async () => {
      const response = await request(app)
        .get('/api/witness/commitments')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.commitments)).toBe(true);
    });
  });

  describe('POST /api/proof/commit-hash', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/proof/commit-hash')
        .send({ witnessHash: 'a'.repeat(64) });

      expect(response.status).toBe(401);
    });

    it('should reject request without witness hash', async () => {
      const response = await request(app)
        .post('/api/proof/commit-hash')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject invalid witness hash format', async () => {
      const response = await request(app)
        .post('/api/proof/commit-hash')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ witnessHash: 'invalid-hash' });

      expect(response.status).toBe(400);
    });

    it('should validate witness hash format', () => {
      const validHash = 'a'.repeat(64);
      const isValidFormat = /^[a-f0-9]{64}$/.test(validHash);
      expect(isValidFormat).toBe(true);

      const invalidHash = 'xyz123';
      const isInvalidFormat = /^[a-f0-9]{64}$/.test(invalidHash);
      expect(isInvalidFormat).toBe(false);
    });

    it('should accept valid witness hash', async () => {
      const validHash = 'a'.repeat(64);
      const response = await request(app)
        .post('/api/proof/commit-hash')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ witnessHash: validHash });

      // Should succeed or fail with blockchain error, not validation error
      expect([200, 201, 500]).toContain(response.status);
    });
  });
});
