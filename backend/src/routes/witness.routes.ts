import { Router } from 'express';
import witnessController from '../controllers/witness.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate, witnessSchemas } from '../middleware/validation.middleware';

const router = Router();

// All witness routes require authentication
router.use(authenticateToken);

/**
 * POST /api/witness/generate
 * Generate witness data by combining Plaid and Stripe data
 */
router.post('/generate', validate(witnessSchemas.generate), witnessController.generateWitness.bind(witnessController));

/**
 * GET /api/witness/commitments
 * Get all witness commitments for the authenticated user
 */
router.get('/commitments', witnessController.getCommitments.bind(witnessController));

/**
 * POST /api/witness/verify
 * Verify a witness hash exists for the user
 */
router.post('/verify', witnessController.verifyCommitment.bind(witnessController));

export default router;
