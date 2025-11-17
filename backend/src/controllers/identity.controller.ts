import { Request, Response } from 'express';
import { personaService } from '../services/persona.service';
import { stripeService } from '../services/stripe.service';
import { features } from '../config/features';
import { CreateVerificationSessionRequest } from '../types/persona.types';
import { CreateIdentitySessionRequest } from '../types/stripe.types';
import { auditExternalService } from '../middleware/logging.middleware';
import logger from '../utils/logger';

export class IdentityController {
  /**
   * POST /api/identity/verification-session
   * Create a new identity verification inquiry
   * Routes to Persona or Stripe based on feature flag
   */
  async createVerificationSession(req: Request, res: Response): Promise<void> {
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

      // Check feature flag to determine which provider to use
      if (features.usePersona) {
        // Use Persona
        const { referenceId } = req.body as CreateVerificationSessionRequest;
        const inquiry = await personaService.createInquiry(userId, referenceId);

        auditExternalService('persona', 'create_inquiry', userId, true, { inquiryId: inquiry.inquiryId });
        logger.info('Identity verification inquiry created (Persona)', { userId, inquiryId: inquiry.inquiryId, provider: 'persona' });

        res.status(200).json({
          inquiryId: inquiry.inquiryId,
          sessionToken: inquiry.sessionToken,
          provider: 'persona'
        });
      } else {
        // Use Stripe Identity (rollback)
        const { returnUrl } = req.body as CreateIdentitySessionRequest;
        const session = await stripeService.createIdentitySession(userId, returnUrl);

        auditExternalService('stripe', 'create_identity_session', userId, true, { sessionId: session.sessionId });
        logger.info('Identity verification session created (Stripe)', { userId, sessionId: session.sessionId, provider: 'stripe' });

        res.status(200).json({
          sessionId: session.sessionId,
          clientSecret: session.clientSecret,
          provider: 'stripe'
        });
      }
    } catch (error) {
      const provider = features.usePersona ? 'persona' : 'stripe';
      auditExternalService(provider, 'create_verification_session', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in createVerificationSession', { error, userId: req.user?.userId, provider });
      res.status(500).json({
        error: {
          code: 'IDENTITY_007',
          message: error instanceof Error ? error.message : 'Failed to create verification session',
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * GET /api/identity/verification-status
   * Get verification status for authenticated user
   * Routes to Persona or Stripe based on feature flag
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

      // Check feature flag to determine which provider to use
      let status;
      let provider: 'persona' | 'stripe';

      if (features.usePersona) {
        status = await personaService.getVerificationStatus(userId);
        provider = 'persona';
      } else {
        status = await stripeService.getVerificationStatus(userId);
        provider = 'stripe';
      }

      if (!status) {
        logger.warn('No verification found for user', { userId, provider });
        res.status(404).json({
          error: {
            code: 'IDENTITY_002',
            message: 'No verification found for user',
            timestamp: Date.now()
          }
        });
        return;
      }

      auditExternalService(provider, 'get_verification_status', userId, true);
      logger.info('Identity verification status fetched', { 
        userId, 
        verified: status.ssnVerified && status.selfieVerified && status.documentVerified,
        provider 
      });

      res.status(200).json(status);
    } catch (error) {
      const provider = features.usePersona ? 'persona' : 'stripe';
      auditExternalService(provider, 'get_verification_status', req.user?.userId || 'unknown', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in getVerificationStatus', { error, userId: req.user?.userId, provider });
      res.status(500).json({
        error: {
          code: 'IDENTITY_001',
          message: error instanceof Error ? error.message : 'Failed to fetch verification status',
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * POST /api/identity/webhook
   * Handle webhook events from Persona or Stripe based on feature flag
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Check feature flag to determine which provider to use
      if (features.usePersona) {
        // Handle Persona webhook
        const signature = req.headers['persona-signature'];

        if (!signature || typeof signature !== 'string') {
          res.status(400).json({
            error: {
              code: 'IDENTITY_003',
              message: 'Missing Persona-Signature header',
              timestamp: Date.now()
            }
          });
          return;
        }

        // Verify webhook signature and construct event
        const event = personaService.verifyWebhookSignature(req.body, signature);

        logger.info('Persona webhook received', { eventType: event.data.attributes.name, eventId: event.data.id, provider: 'persona' });

        // Handle the event
        await personaService.handleWebhookEvent(event);

        const processingTime = Date.now() - startTime;
        const metricsService = require('../services/metrics.service').default;
        await metricsService.trackPersonaWebhook(event.data.attributes.name, true, processingTime);

        auditExternalService('persona', 'webhook_received', 'system', true, { eventType: event.data.attributes.name, eventId: event.data.id });
        logger.info('Persona webhook processed successfully', { eventType: event.data.attributes.name, eventId: event.data.id, processingTime });

        res.status(200).json({ received: true });
      } else {
        // Handle Stripe webhook (rollback)
        const signature = req.headers['stripe-signature'];

        if (!signature || typeof signature !== 'string') {
          res.status(400).json({
            error: {
              code: 'IDENTITY_003',
              message: 'Missing stripe-signature header',
              timestamp: Date.now()
            }
          });
          return;
        }

        // Verify webhook signature and construct event
        const event = stripeService.verifyWebhookSignature(req.body, signature);

        logger.info('Stripe webhook received', { eventType: event.type, eventId: event.id, provider: 'stripe' });

        // Handle the event
        await stripeService.handleWebhookEvent(event);

        auditExternalService('stripe', 'webhook_received', 'system', true, { eventType: event.type, eventId: event.id });
        logger.info('Stripe webhook processed successfully', { eventType: event.type, eventId: event.id });

        res.status(200).json({ received: true });
      }
    } catch (error) {
      const provider = features.usePersona ? 'persona' : 'stripe';
      const processingTime = Date.now() - startTime;
      
      if (provider === 'persona') {
        const metricsService = require('../services/metrics.service').default;
        await metricsService.trackPersonaWebhook('unknown', false, processingTime);
      }
      
      auditExternalService(provider, 'webhook_received', 'system', false, { error: error instanceof Error ? error.message : 'Unknown error' });
      logger.error('Error in handleWebhook', { error, provider, processingTime });
      res.status(400).json({
        error: {
          code: 'IDENTITY_004',
          message: error instanceof Error ? error.message : 'Webhook processing failed',
          timestamp: Date.now()
        }
      });
    }
  }
}

export const identityController = new IdentityController();
