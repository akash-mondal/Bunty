import { Request, Response } from 'express';
import { indexerService } from '../services/indexer.service';
import logger from '../utils/logger';

/**
 * Indexer Controller
 * 
 * Provides REST API endpoints for querying proof records from the Midnight indexer.
 * These endpoints are used by verifiers (lenders, rental platforms, DeFi protocols)
 * to validate proofs without accessing raw user data.
 */

/**
 * GET /api/indexer/proof/:nullifier
 * 
 * Query proof by nullifier
 * Returns proof record if found, 404 if not found
 */
export const getProofByNullifier = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nullifier } = req.params;

    if (!nullifier) {
      res.status(400).json({
        error: {
          code: 'INDEXER_001',
          message: 'Nullifier parameter is required',
        },
      });
      return;
    }

    const proof = await indexerService.getProofByNullifier(nullifier);

    if (!proof) {
      logger.info('Proof not found by nullifier', { nullifier });
      res.status(404).json({
        error: {
          code: 'INDEXER_002',
          message: 'Proof not found',
        },
      });
      return;
    }

    logger.info('Proof queried by nullifier', { nullifier, isValid: proof.isValid });

    res.status(200).json({
      success: true,
      data: proof,
    });
  } catch (error) {
    logger.error('Error in getProofByNullifier', { error, nullifier: req.params.nullifier });
    res.status(500).json({
      error: {
        code: 'INDEXER_003',
        message: 'Failed to query proof',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/indexer/proofs/user/:userDID
 * 
 * Query all proofs for a specific user DID
 * Returns array of proof records
 */
export const getProofsByUserDID = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userDID } = req.params;

    if (!userDID) {
      res.status(400).json({
        error: {
          code: 'INDEXER_004',
          message: 'User DID parameter is required',
        },
      });
      return;
    }

    const proofs = await indexerService.getProofsByUserDID(userDID);

    logger.info('Proofs queried by user DID', { userDID, count: proofs.length });

    res.status(200).json({
      success: true,
      data: proofs,
      count: proofs.length,
    });
  } catch (error) {
    logger.error('Error in getProofsByUserDID', { error, userDID: req.params.userDID });
    res.status(500).json({
      error: {
        code: 'INDEXER_005',
        message: 'Failed to query proofs by user DID',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/indexer/proofs
 * 
 * Query all proofs with pagination
 * Query params: limit (default: 50), offset (default: 0)
 */
export const getAllProofs = async (req: Request, res: Response): Promise<void> => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  try {
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: {
          code: 'INDEXER_006',
          message: 'Limit must be between 1 and 100',
        },
      });
      return;
    }

    if (offset < 0) {
      res.status(400).json({
        error: {
          code: 'INDEXER_007',
          message: 'Offset must be non-negative',
        },
      });
      return;
    }

    const proofs = await indexerService.getAllProofs(limit, offset);

    logger.info('All proofs queried', { count: proofs.length, limit: limit, offset: offset });

    res.status(200).json({
      success: true,
      data: proofs,
      count: proofs.length,
      pagination: {
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Error in getAllProofs', { error, limit: limit, offset: offset });
    res.status(500).json({
      error: {
        code: 'INDEXER_008',
        message: 'Failed to query all proofs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * POST /api/indexer/verify
 * 
 * Verify proof validity by nullifier
 * Body: { nullifier: string }
 * Returns validation result with isValid flag
 */
export const verifyProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nullifier } = req.body;

    if (!nullifier) {
      res.status(400).json({
        error: {
          code: 'INDEXER_009',
          message: 'Nullifier is required in request body',
        },
      });
      return;
    }

    const validation = await indexerService.verifyProof(nullifier);

    if (!validation) {
      logger.info('Proof verification failed - not found', { nullifier });
      res.status(404).json({
        error: {
          code: 'INDEXER_010',
          message: 'Proof not found',
        },
      });
      return;
    }

    logger.info('Proof verified', { nullifier, isValid: validation.isValid });

    res.status(200).json({
      success: true,
      data: validation,
    });
  } catch (error) {
    logger.error('Error in verifyProof', { error, nullifier: req.body.nullifier });
    res.status(500).json({
      error: {
        code: 'INDEXER_011',
        message: 'Failed to verify proof',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};

/**
 * GET /api/indexer/health
 * 
 * Check indexer health status
 * Returns health status and indexer URL
 */
export const getIndexerHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const isHealthy = await indexerService.healthCheck();
    const indexerUrl = indexerService.getIndexerUrl();

    logger.info('Indexer health checked', { isHealthy, indexerUrl });

    res.status(isHealthy ? 200 : 503).json({
      success: isHealthy,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        indexerUrl,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error in getIndexerHealth', { error });
    res.status(500).json({
      error: {
        code: 'INDEXER_012',
        message: 'Failed to check indexer health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
