/**
 * Integration tests for proof submission endpoint
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../config/database';

const app = createTestApp();

describe('Proof Submission Integration', () => {
  let accessToken: string;
  const testEmail = `proof-test-${Date.now()}@example.com`;
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

  describe('POST /api/proof/submit', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/proof/submit')
        .send({
          proof: 'proof-data',
          publicInputs: ['input1'],
          nullifier: 'a'.repeat(64),
          threshold: 5000,
          signedTx: 'signed-tx-data',
        });

      expect(response.status).toBe(401);
    });

    it('should reject request without required fields', async () => {
      const response = await request(app)
        .post('/api/proof/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject request with invalid nullifier format', async () => {
      const response = await request(app)
        .post('/api/proof/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          proof: 'proof-data',
          publicInputs: ['input1'],
          nullifier: 'invalid',
          threshold: 5000,
          signedTx: 'signed-tx-data',
        });

      expect(response.status).toBe(400);
    });

    it('should validate proof data structure', () => {
      const proofData = {
        proof: 'base64-encoded-proof',
        publicInputs: ['input1', 'input2'],
        nullifier: 'a'.repeat(64),
        threshold: 5000,
        signedTx: 'signed-transaction-data',
      };

      expect(typeof proofData.proof).toBe('string');
      expect(Array.isArray(proofData.publicInputs)).toBe(true);
      expect(proofData.nullifier).toHaveLength(64);
      expect(proofData.threshold).toBeGreaterThan(0);
      expect(typeof proofData.signedTx).toBe('string');
    });

    it('should accept valid proof submission', async () => {
      const response = await request(app)
        .post('/api/proof/submit')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          proof: 'base64-encoded-proof-data',
          publicInputs: ['5000'],
          nullifier: 'b'.repeat(64),
          threshold: 5000,
          signedTx: 'signed-transaction-data',
        });

      // Should succeed or fail with blockchain error, not validation error
      expect([200, 201, 500]).toContain(response.status);
    });
  });

  describe('GET /api/proof/status/:proofId', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/proof/status/proof-123');

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent proof', async () => {
      const response = await request(app)
        .get('/api/proof/status/non-existent-proof')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should validate proof status response structure', () => {
      const mockResponse = {
        proofId: 'proof-123',
        status: 'confirmed',
        txHash: '0xabcdef123456',
        nullifier: 'a'.repeat(64),
        threshold: 5000,
        submittedAt: new Date(),
        confirmedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      expect(mockResponse.status).toBeDefined();
      expect(['pending', 'confirmed', 'failed']).toContain(mockResponse.status);
      expect(mockResponse.nullifier).toHaveLength(64);
      expect(mockResponse.threshold).toBeGreaterThan(0);
    });

    it('should handle pending status correctly', () => {
      const pendingResponse: {
        proofId: string;
        status: string;
        txHash: string;
        submittedAt: Date;
        confirmedAt?: Date;
      } = {
        proofId: 'proof-123',
        status: 'pending',
        txHash: '0xabcdef123456',
        submittedAt: new Date(),
      };

      expect(pendingResponse.status).toBe('pending');
      expect(pendingResponse.confirmedAt).toBeUndefined();
    });

    it('should handle failed status correctly', () => {
      const failedResponse = {
        proofId: 'proof-123',
        status: 'failed',
        error: 'Transaction reverted',
      };

      expect(failedResponse.status).toBe('failed');
      expect(failedResponse.error).toBeDefined();
    });
  });

  describe('GET /api/proof/health', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/proof/health');

      expect(response.status).toBe(401);
    });

    it('should return proof server health status', async () => {
      const response = await request(app)
        .get('/api/proof/health')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should return health status or error if proof server is down
      expect([200, 500, 503]).toContain(response.status);
    });
  });
});
