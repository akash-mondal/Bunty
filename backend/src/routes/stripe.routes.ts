/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Stripe Identity has been replaced with Persona for identity verification.
 * Use /api/identity routes instead.
 * 
 * This file is kept temporarily for rollback capability only.
 * Removal planned after 2-week stabilization period.
 */

import { Router } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import express from 'express';

const router = Router();

/**
 * @deprecated Use POST /api/identity/verification-session instead
 * POST /api/stripe/identity-session
 * Create a new Stripe Identity verification session
 * Requires authentication
 */
router.post(
  '/identity-session',
  authenticateToken,
  (req, res) => stripeController.createIdentitySession(req, res)
);

/**
 * @deprecated Use GET /api/identity/verification-status instead
 * GET /api/stripe/verification-status
 * Get verification status for authenticated user
 * Requires authentication
 */
router.get(
  '/verification-status',
  authenticateToken,
  (req, res) => stripeController.getVerificationStatus(req, res)
);

/**
 * @deprecated Use POST /api/identity/webhook instead
 * POST /api/stripe/webhook
 * Handle Stripe webhook events
 * Note: This endpoint uses raw body for signature verification
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => stripeController.handleWebhook(req, res)
);

export default router;
