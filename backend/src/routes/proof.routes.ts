import { Router } from 'express';
import witnessController from '../controllers/witness.controller';
import * as proofController from '../controllers/proof.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate, proofSchemas } from '../middleware/validation.middleware';

const router = Router();

// All proof routes require authentication
router.use(authenticateToken);

/**
 * POST /api/proof/commit-hash
 * Commit witness hash to database and blockchain
 */
router.post('/commit-hash', validate(proofSchemas.commitHash), witnessController.commitHash.bind(witnessController));

/**
 * POST /api/proof/generate
 * Generate a zero-knowledge proof using the proof server
 */
router.post('/generate', proofController.generateProof);

/**
 * POST /api/proof/submit
 * Submit a proof to the Midnight blockchain
 */
router.post('/submit', validate(proofSchemas.submit), proofController.submitProof);

/**
 * GET /api/proof/status/:proofId
 * Get proof submission status
 */
router.get('/status/:proofId', proofController.getProofStatus);

/**
 * GET /api/proof/health
 * Health check for proof server
 */
router.get('/health', proofController.proofServerHealth);

export default router;
