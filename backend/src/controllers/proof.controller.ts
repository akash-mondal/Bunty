import { Request, Response } from 'express';
import proofServerService from '../services/proofServer.service';
import midnightService from '../services/midnight.service';
import proofStatusPoller from '../services/proofStatusPoller.service';
import pool from '../config/database';
import {
  CircuitType,
  ProofPublicInputs,
  SubmitProofRequest,
  SubmitProofResponse,
  ProofStatusResponse,
  ProofStatus,
} from '../types/proof.types';
import { Witness } from '../types/witness.types';
import { auditProofSubmission } from '../middleware/logging.middleware';
import logger from '../utils/logger';
import metricsService from '../services/metrics.service';

/**
 * Generate a zero-knowledge proof
 * POST /api/proof/generate
 */
export const generateProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const { circuit, witness, threshold } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate required fields
    if (!circuit || !witness || threshold === undefined) {
      res.status(400).json({
        error: 'Missing required fields: circuit, witness, threshold',
      });
      return;
    }

    // Validate circuit type
    const validCircuits: CircuitType[] = [
      'verifyIncome',
      'verifyAssets',
      'verifyCreditworthiness',
    ];
    if (!validCircuits.includes(circuit)) {
      res.status(400).json({
        error: `Invalid circuit type. Must be one of: ${validCircuits.join(', ')}`,
      });
      return;
    }

    // Validate witness structure
    if (!isValidWitness(witness)) {
      res.status(400).json({
        error: 'Invalid witness structure',
      });
      return;
    }

    // Validate threshold
    if (typeof threshold !== 'number' || threshold < 0) {
      res.status(400).json({
        error: 'Threshold must be a positive number',
      });
      return;
    }

    const publicInputs: ProofPublicInputs = { threshold };

    logger.info('Generating proof', { userId, circuit, threshold });

    const startTime = Date.now();
    
    // Generate proof using proof server
    const zkProof = await proofServerService.generateProof(
      circuit as CircuitType,
      witness as Witness,
      publicInputs
    );

    const duration = Date.now() - startTime;

    auditProofSubmission(userId, 'pending', 'generated', { circuit, threshold });
    logger.info('Proof generated successfully', { userId, circuit, duration });
    
    // Track metrics
    await metricsService.trackProofGeneration(userId, circuit, true, duration);

    res.json({
      success: true,
      proof: zkProof,
    });
  } catch (error: any) {
    const userId = req.user?.userId;
    const { circuit } = req.body;
    const duration = 0;
    logger.error('Error generating proof', { error, userId, circuit });
    
    // Track failed proof generation
    if (userId && circuit) {
      await metricsService.trackProofGeneration(userId, circuit, false, duration);
    }
    res.status(500).json({
      error: 'Failed to generate proof',
      message: error.message,
    });
  }
};

/**
 * Submit a proof to the Midnight blockchain
 * POST /api/proof/submit
 */
export const submitProof = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proof, walletSignature } = req.body as SubmitProofRequest;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validate required fields
    if (!proof || !walletSignature) {
      res.status(400).json({
        error: 'Missing required fields: proof, walletSignature',
      });
      return;
    }

    // Validate proof structure
    if (!proof.proof || !proof.publicOutputs || !proof.publicOutputs.nullifier) {
      res.status(400).json({
        error: 'Invalid proof structure',
      });
      return;
    }

    logger.info('Submitting proof', { userId, nullifier: proof.publicOutputs.nullifier });

    // Check if nullifier already exists (prevent replay)
    const existingProof = await pool.query(
      'SELECT id FROM proof_submissions WHERE nullifier = $1',
      [proof.publicOutputs.nullifier]
    );

    if (existingProof.rows.length > 0) {
      logger.warn('Proof submission rejected - nullifier already used', {
        userId,
        nullifier: proof.publicOutputs.nullifier,
      });
      res.status(409).json({
        error: 'Proof with this nullifier already exists',
        code: 'NULLIFIER_ALREADY_USED',
      });
      return;
    }

    // Submit transaction to Midnight Network
    const txHash = await midnightService.submitTransaction(
      walletSignature,
      proof
    );

    // Generate proof ID
    const proofId = `proof_${Date.now()}_${proof.publicOutputs.nullifier.substring(0, 8)}`;

    // Calculate expiry date (30 days from now)
    const expiresAt = new Date(proof.publicOutputs.expiresAt * 1000);

    // Store proof submission in database
    const result = await pool.query(
      `INSERT INTO proof_submissions 
       (user_id, proof_id, nullifier, tx_hash, threshold, status, expires_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, proof_id, status, submitted_at`,
      [
        userId,
        proofId,
        proof.publicOutputs.nullifier,
        txHash,
        proof.publicInputs[0], // threshold
        'pending',
        expiresAt,
      ]
    );

    const submission = result.rows[0];

    auditProofSubmission(userId, submission.proof_id, 'submitted', {
      txHash,
      nullifier: proof.publicOutputs.nullifier,
      threshold: proof.publicInputs[0],
    });
    logger.info('Proof submitted successfully', {
      userId,
      proofId: submission.proof_id,
      txHash,
    });

    // Track metrics
    await metricsService.trackProofSubmission(submission.proof_id, 'submitted');

    const response: SubmitProofResponse = {
      txHash,
      proofId: submission.proof_id,
      status: submission.status as ProofStatus,
    };

    res.json(response);
  } catch (error: any) {
    const userId = req.user?.userId;
    logger.error('Error submitting proof', { error, userId });
    
    // Track failed submission
    await metricsService.trackProofSubmission('unknown', 'failed');
    res.status(500).json({
      error: 'Failed to submit proof',
      message: error.message,
    });
  }
};

/**
 * Get proof submission status
 * GET /api/proof/status/:proofId
 */
export const getProofStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { proofId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Query proof submission
    const result = await pool.query(
      `SELECT proof_id, nullifier, tx_hash, threshold, status, 
              submitted_at, confirmed_at, expires_at
       FROM proof_submissions 
       WHERE proof_id = $1 AND user_id = $2`,
      [proofId, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        error: 'Proof not found',
      });
      return;
    }

    const proof = result.rows[0];

    // If status is pending, trigger a manual poll to get latest status
    if (proof.status === 'pending') {
      try {
        await proofStatusPoller.pollSpecificProof(proofId);
        
        // Re-query to get updated status
        const updatedResult = await pool.query(
          `SELECT proof_id, nullifier, tx_hash, threshold, status, 
                  submitted_at, confirmed_at, expires_at
           FROM proof_submissions 
           WHERE proof_id = $1`,
          [proofId]
        );
        
        if (updatedResult.rows.length > 0) {
          Object.assign(proof, updatedResult.rows[0]);
        }
      } catch (error) {
        console.error('Error polling proof status:', error);
        // Continue with current status if poll fails
      }
    }

    const response: ProofStatusResponse = {
      proofId: proof.proof_id,
      nullifier: proof.nullifier,
      txHash: proof.tx_hash,
      threshold: proof.threshold,
      status: proof.status,
      submittedAt: proof.submitted_at,
      confirmedAt: proof.confirmed_at,
      expiresAt: proof.expires_at,
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching proof status:', error);
    res.status(500).json({
      error: 'Failed to fetch proof status',
      message: error.message,
    });
  }
};

/**
 * Health check for proof server
 * GET /api/proof/health
 */
export const proofServerHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    const isHealthy = await proofServerService.healthCheck();
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        proofServer: 'available',
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        proofServer: 'unavailable',
      });
    }
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      proofServer: 'unavailable',
      error: error.message,
    });
  }
};

/**
 * Validate witness structure
 */
function isValidWitness(witness: any): witness is Witness {
  return (
    witness &&
    typeof witness.income === 'number' &&
    typeof witness.employmentMonths === 'number' &&
    typeof witness.employerHash === 'string' &&
    typeof witness.assets === 'number' &&
    typeof witness.liabilities === 'number' &&
    typeof witness.creditScore === 'number' &&
    typeof witness.ssnVerified === 'boolean' &&
    typeof witness.selfieVerified === 'boolean' &&
    typeof witness.documentVerified === 'boolean' &&
    typeof witness.timestamp === 'number'
  );
}
