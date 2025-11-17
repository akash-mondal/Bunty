import { Router } from 'express';
import { identityController } from '../controllers/identity.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimit.middleware';
import express from 'express';

const router = Router();

// Rate limiter for identity verification endpoints
const identityRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // 10 requests per minute per IP
});

/**
 * POST /api/identity/verification-session
 * Create a new identity verification inquiry
 * Requires authentication
 */
router.post(
  '/verification-session',
  authenticateToken,
  identityRateLimiter,
  (req, res) => identityController.createVerificationSession(req, res)
);

/**
 * GET /api/identity/verification-status
 * Get verification status for authenticated user
 * Requires authentication
 */
router.get(
  '/verification-status',
  authenticateToken,
  identityRateLimiter,
  (req, res) => identityController.getVerificationStatus(req, res)
);

/**
 * POST /api/identity/webhook
 * Handle Persona webhook events
 * Note: This endpoint uses raw body for signature verification
 * No authentication required - signature verification is done in the controller
 */
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => identityController.handleWebhook(req, res)
);

export default router;
