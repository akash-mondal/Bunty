import { Router } from 'express';
import { stripeController } from '../controllers/stripe.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import express from 'express';

const router = Router();

/**
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
