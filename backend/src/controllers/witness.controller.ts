import { Request, Response } from 'express';
import witnessService from '../services/witness.service';
import { auditSensitiveOperation } from '../middleware/logging.middleware';
import logger from '../utils/logger';

export class WitnessController {
  /**
   * POST /api/witness/generate
   * Generate witness data by normalizing Plaid and Stripe data
   */
  async generateWitness(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const result = await witnessService.generateWitness(userId);

      auditSensitiveOperation('witness_generation', userId, true);
      logger.info('Witness data generated', { userId, witnessHash: result.witnessHash });

      res.json(result);
    } catch (error: any) {
      auditSensitiveOperation('witness_generation', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in generateWitness', { error, userId: req.user?.userId });
      
      // Determine appropriate status code
      let statusCode = 500;
      let errorCode = 'WITNESS_001';
      
      if (error.message.includes('not completed identity verification')) {
        statusCode = 400;
        errorCode = 'WITNESS_002';
      } else if (error.message.includes('No Plaid connection')) {
        statusCode = 400;
        errorCode = 'WITNESS_003';
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message: error.message || 'Failed to generate witness data',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/proof/commit-hash
   * Commit witness hash to database and blockchain
   */
  async commitHash(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { witnessHash } = req.body;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (!witnessHash) {
        res.status(400).json({
          error: {
            code: 'WITNESS_004',
            message: 'Witness hash is required',
            timestamp: Date.now(),
          },
        });
        return;
      }

      // Validate hash format (should be 64 character hex string)
      if (!/^[a-f0-9]{64}$/i.test(witnessHash)) {
        res.status(400).json({
          error: {
            code: 'WITNESS_005',
            message: 'Invalid witness hash format',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const commitment = await witnessService.commitHash(userId, witnessHash);

      auditSensitiveOperation('witness_hash_commit', userId, true, { witnessHash });
      logger.info('Witness hash committed', { userId, witnessHash });

      res.json(commitment);
    } catch (error: any) {
      auditSensitiveOperation('witness_hash_commit', req.user?.userId || 'unknown', false, { error: error.message });
      logger.error('Error in commitHash', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'WITNESS_006',
          message: error.message || 'Failed to commit witness hash',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * GET /api/witness/commitments
   * Get all witness commitments for the authenticated user
   */
  async getCommitments(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const commitments = await witnessService.getUserCommitments(userId);

      logger.info('Witness commitments fetched', { userId, count: commitments.length });

      res.json({
        commitments,
        count: commitments.length,
      });
    } catch (error: any) {
      logger.error('Error in getCommitments', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'WITNESS_007',
          message: error.message || 'Failed to fetch commitments',
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * POST /api/witness/verify
   * Verify a witness hash exists for the user
   */
  async verifyCommitment(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { witnessHash } = req.body;

      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now(),
          },
        });
        return;
      }

      if (!witnessHash) {
        res.status(400).json({
          error: {
            code: 'WITNESS_004',
            message: 'Witness hash is required',
            timestamp: Date.now(),
          },
        });
        return;
      }

      const isValid = await witnessService.verifyCommitment(userId, witnessHash);

      logger.info('Witness commitment verified', { userId, witnessHash, valid: isValid });

      res.json({
        valid: isValid,
        witnessHash,
      });
    } catch (error: any) {
      logger.error('Error in verifyCommitment', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'WITNESS_008',
          message: error.message || 'Failed to verify commitment',
          timestamp: Date.now(),
        },
      });
    }
  }
}

export default new WitnessController();
