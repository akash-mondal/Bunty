import { Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { CreateIdentitySessionRequest } from '../types/stripe.types';

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

      res.status(200).json({
        sessionId: session.sessionId,
        clientSecret: session.clientSecret
      });
    } catch (error) {
      console.error('Error in createIdentitySession:', error);
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
        res.status(404).json({
          error: {
            code: 'STRIPE_002',
            message: 'No verification found for user',
            timestamp: Date.now()
          }
        });
        return;
      }

      res.status(200).json(status);
    } catch (error) {
      console.error('Error in getVerificationStatus:', error);
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

      // Handle the event
      await stripeService.handleWebhookEvent(event);

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error in handleWebhook:', error);
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
