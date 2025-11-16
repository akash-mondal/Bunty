import Stripe from 'stripe';
import pool from '../config/database';
import { StripeVerification, VerificationStatus } from '../types/stripe.types';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export class StripeService {
  /**
   * Create a Stripe Identity verification session
   */
  async createIdentitySession(userId: string, returnUrl?: string): Promise<{ sessionId: string; clientSecret: string }> {
    try {
      // Create verification session with Stripe
      const verificationSession = await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          user_id: userId,
        },
        options: {
          document: {
            require_id_number: true,
            require_live_capture: true,
            require_matching_selfie: true,
          },
        },
        ...(returnUrl && { return_url: returnUrl }),
      });

      // Store session in database
      await pool.query(
        `INSERT INTO stripe_verifications (user_id, session_id)
         VALUES ($1, $2)
         ON CONFLICT (session_id) DO NOTHING`,
        [userId, verificationSession.id]
      );

      return {
        sessionId: verificationSession.id,
        clientSecret: verificationSession.client_secret || '',
      };
    } catch (error) {
      console.error('Error creating Stripe Identity session:', error);
      throw new Error('Failed to create identity verification session');
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus | null> {
    try {
      const result = await pool.query<StripeVerification>(
        `SELECT * FROM stripe_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const verification = result.rows[0];

      return {
        ssnVerified: verification.ssn_verified,
        selfieVerified: verification.selfie_verified,
        documentVerified: verification.document_verified,
        completedAt: verification.completed_at || undefined,
      };
    } catch (error) {
      console.error('Error fetching verification status:', error);
      throw new Error('Failed to fetch verification status');
    }
  }

  /**
   * Handle webhook event from Stripe
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      if (event.type === 'identity.verification_session.verified' || 
          event.type === 'identity.verification_session.requires_input') {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        
        // Extract verification results
        const lastVerificationReport = session.last_verification_report;
        let ssnVerified = false;
        let selfieVerified = false;
        let documentVerified = false;

        if (lastVerificationReport && typeof lastVerificationReport !== 'string') {
          // Check document verification
          if (lastVerificationReport.document) {
            documentVerified = lastVerificationReport.document.status === 'verified';
          }

          // Check selfie verification
          if (lastVerificationReport.selfie) {
            selfieVerified = lastVerificationReport.selfie.status === 'verified';
          }

          // Check ID number (SSN) verification
          if (lastVerificationReport.id_number) {
            ssnVerified = lastVerificationReport.id_number.status === 'verified';
          }
        }

        const isCompleted = session.status === 'verified';
        const completedAt = isCompleted ? new Date() : null;

        // Update verification status in database
        await pool.query(
          `UPDATE stripe_verifications 
           SET ssn_verified = $1, 
               selfie_verified = $2, 
               document_verified = $3,
               completed_at = $4
           WHERE session_id = $5`,
          [ssnVerified, selfieVerified, documentVerified, completedAt, session.id]
        );

        console.log(`Updated verification status for session ${session.id}`);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw new Error('Failed to process webhook event');
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
    }

    try {
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Get verification session details from Stripe
   */
  async getVerificationSession(sessionId: string): Promise<Stripe.Identity.VerificationSession> {
    try {
      return await stripe.identity.verificationSessions.retrieve(sessionId);
    } catch (error) {
      console.error('Error retrieving verification session:', error);
      throw new Error('Failed to retrieve verification session');
    }
  }
}

export const stripeService = new StripeService();
