import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { CreateIdentitySessionRequest } from '../types/stripe.types';
import { auditExternalService } from '../middleware/logging.middleware';
import logger from '../utils/logger';

export class StripeController {
  /**
   * POST /api/stripe/identity-session
   * Create a new Stripe Identity verification session
   */
  async createIdentitySession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now()
          }
        });
        return;
      }

      const { returnUrl } = req.body as CreateIdentitySessionRequest;

      const session = await stripeService.createIdentitySession(userId, returnUrl);

      auditExternalService('stripe', 'create_identity_session', userId, true, { sessionId: session.sessionId });
      logger.info('Stripe identity session created', { userId, sessionId: session.sessionId });

      res.status(200).json({
        sessionId: session.sessionId,
        clientSecret: session.clientSecret
      });
    } catch (error) {
      auditExternalService('stripe', 'create_identity_session', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in createIdentitySession', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'STRIPE_001',
          message: error instanceof Error ? error.message : 'Failed to create identity session',
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * GET /api/stripe/verification-status
   * Get the verification status for the authenticated user
   */
  async getVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          error: {
            code: 'AUTH_001',
            message: 'User not authenticated',
            timestamp: Date.now()
          }
        });
        return;
      }

      const status = await stripeService.getVerificationStatus(userId);

      if (!status) {
        logger.warn('No verification found for user', { userId });
        res.status(404).json({
          error: {
            code: 'STRIPE_002',
            message: 'No verification found for user',
            timestamp: Date.now()
          }
        });
        return;
      }

      auditExternalService('stripe', 'get_verification_status', userId, true);
      logger.info('Stripe verification status fetched', { userId, verified: status.ssnVerified && status.selfieVerified && status.documentVerified });

      res.status(200).json(status);
    } catch (error) {
      auditExternalService('stripe', 'get_verification_status', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in getVerificationStatus', { error, userId: req.user?.userId });
      res.status(500).json({
        error: {
          code: 'STRIPE_001',
          message: error instanceof Error ? error.message : 'Failed to fetch verification status',
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * POST /api/stripe/webhook
   * Handle Stripe webhook events
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        res.status(400).json({
          error: {
            code: 'STRIPE_003',
            message: 'Missing stripe-signature header',
            timestamp: Date.now()
          }
        });
        return;
      }

      // Verify webhook signature and construct event
      const event = stripeService.verifyWebhookSignature(req.body, signature);

      logger.info('Stripe webhook received', { eventType: event.type, eventId: event.id });

      // Handle the event
      await stripeService.handleWebhookEvent(event);

      auditExternalService('stripe', 'webhook_received', 'system', true, { eventType: event.type, eventId: event.id });
      logger.info('Stripe webhook processed successfully', { eventType: event.type, eventId: event.id });

      res.status(200).json({ received: true });
    } catch (error) {
      auditExternalService('stripe', 'webhook_received', 'system', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in handleWebhook', { error });
      res.status(400).json({
        error: {
          code: 'STRIPE_004',
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          timestamp: Date.now()
        }
      });
    }
  }
}

export const stripeController = new StripeController();
