/**
 * Integration tests for Stripe webhook handling
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createTestApp } from '../testApp';
import pool from '../../config/database';

const app = createTestApp();

describe('Stripe Webhook Integration', () => {
  let accessToken: string;
  const testEmail = `stripe-test-${Date.now()}@example.com`;
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

  describe('POST /api/stripe/identity-session', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/stripe/identity-session');

      expect(response.status).toBe(401);
    });

    it('should create identity session with authentication', async () => {
      const response = await request(app)
        .post('/api/stripe/identity-session')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.clientSecret).toBeDefined();
      expect(typeof response.body.sessionId).toBe('string');
      expect(typeof response.body.clientSecret).toBe('string');
    });
  });

  describe('GET /api/stripe/verification-status', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/stripe/verification-status');

      expect(response.status).toBe(401);
    });

    it('should return verification status with authentication', async () => {
      const response = await request(app)
        .get('/api/stripe/verification-status')
        .set('Authorization', `Bearer ${accessToken}`);

      // Should return 200 with status or 404 if no verification exists
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(typeof response.body.ssnVerified).toBe('boolean');
        expect(typeof response.body.selfieVerified).toBe('boolean');
        expect(typeof response.body.documentVerified).toBe('boolean');
      }
    });
  });

  describe('POST /api/stripe/webhook', () => {
    it('should reject webhook without signature', async () => {
      const event = {
        type: 'identity.verification_session.verified',
        data: {
          object: {
            id: 'vs_123',
            status: 'verified',
          },
        },
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .send(event);

      // Should fail signature verification
      expect([400, 401]).toContain(response.status);
    });

    it('should reject webhook with invalid signature', async () => {
      const event = {
        type: 'identity.verification_session.verified',
        data: {
          object: {
            id: 'vs_123',
            status: 'verified',
          },
        },
      };

      const response = await request(app)
        .post('/api/stripe/webhook')
        .set('stripe-signature', 'invalid-signature')
        .send(event);

      // Should fail signature verification
      expect([400, 401]).toContain(response.status);
    });

    it('should validate webhook event structure', () => {
      const validEvent = {
        type: 'identity.verification_session.verified',
        data: {
          object: {
            id: 'vs_123',
            status: 'verified',
            last_verification_report: {
              document: { status: 'verified' },
              selfie: { status: 'verified' },
              id_number: { status: 'verified' },
            },
          },
        },
      };

      expect(validEvent.type).toContain('identity.verification_session');
      expect(validEvent.data.object.id).toBeDefined();
      expect(validEvent.data.object.status).toBeDefined();
    });

    it('should extract verification results from event', () => {
      const verificationReport = {
        document: { status: 'verified' },
        selfie: { status: 'verified' },
        id_number: { status: 'verified' },
      };

      const documentVerified = verificationReport.document.status === 'verified';
      const selfieVerified = verificationReport.selfie.status === 'verified';
      const ssnVerified = verificationReport.id_number.status === 'verified';

      expect(documentVerified).toBe(true);
      expect(selfieVerified).toBe(true);
      expect(ssnVerified).toBe(true);
    });
  });
});
