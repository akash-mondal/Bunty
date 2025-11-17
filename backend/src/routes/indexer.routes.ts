import { Router } from 'express';
import * as indexerController from '../controllers/indexer.controller';

const router = Router();

/**
 * Indexer routes for querying proof records from Midnight GraphQL indexer
 * These endpoints are public and can be used by verifiers without authentication
 */

/**
 * GET /api/indexer/health
 * Check indexer health status
 */
router.get('/health', indexerController.getIndexerHealth);

/**
 * GET /api/indexer/proof/:nullifier
 * Query proof by nullifier
 */
router.get('/proof/:nullifier', indexerController.getProofByNullifier);

/**
 * GET /api/indexer/proofs/user/:userDID
 * Query all proofs for a specific user DID
 */
router.get('/proofs/user/:userDID', indexerController.getProofsByUserDID);

/**
 * GET /api/indexer/proofs
 * Query all proofs with pagination
 * Query params: limit (default: 50), offset (default: 0)
 */
router.get('/proofs', indexerController.getAllProofs);

/**
 * POST /api/indexer/verify
 * Verify proof validity by nullifier
 * Body: { nullifier: string }
 */
router.post('/verify', indexerController.verifyProof);

export default router;
