import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import pool from '../config/database';
import logger from '../utils/logger';
import metricsService from './metrics.service';
import {
  PersonaConfig,
  InquiryResponse,
  VerificationStatus,
  PersonaWebhookEvent,
  PersonaInquiry,
  PersonaVerificationReport,
  PersonaVerification,
} from '../types/persona.types';

export class PersonaService {
  private client: AxiosInstance;
  private config: PersonaConfig;

  constructor() {
    // Validate required environment variables
    if (!process.env.PERSONA_API_KEY) {
      throw new Error('PERSONA_API_KEY is not configured');
    }
    if (!process.env.PERSONA_TEMPLATE_ID) {
      throw new Error('PERSONA_TEMPLATE_ID is not configured');
    }
    if (!process.env.PERSONA_WEBHOOK_SECRET) {
      throw new Error('PERSONA_WEBHOOK_SECRET is not configured');
    }

    this.config = {
      apiKey: process.env.PERSONA_API_KEY,
      environment: (process.env.PERSONA_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      templateId: process.env.PERSONA_TEMPLATE_ID,
      webhookSecret: process.env.PERSONA_WEBHOOK_SECRET,
    };

    // Initialize Persona API client using axios
    const baseURL = this.config.environment === 'sandbox'
      ? 'https://withpersona.com/api/v1'
      : 'https://withpersona.com/api/v1';

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
      },
    });

    logger.info('PersonaService initialized', {
      environment: this.config.environment,
    });
  }

  /**
   * Create a new Persona inquiry for identity verification
   * @param userId - User ID from the database
   * @param referenceId - Optional reference ID for tracking
   * @returns Inquiry ID and session token
   */
  async createInquiry(userId: string, referenceId?: string): Promise<InquiryResponse> {
    const startTime = Date.now();
    
    try {
      logger.info('Creating Persona inquiry', { userId, referenceId });

      // Create inquiry with Persona API
      const response = await this.client.post('/inquiries', {
        data: {
          type: 'inquiry',
          attributes: {
            'inquiry-template-id': this.config.templateId,
            'reference-id': referenceId || userId,
          },
        },
      });

      const inquiryId = response.data.data.id;
      const sessionToken = response.data.data.attributes['session-token'];

      if (!sessionToken) {
        throw new Error('Session token not returned from Persona API');
      }

      // Store inquiry in database
      await pool.query(
        `INSERT INTO persona_verifications (user_id, inquiry_id)
         VALUES ($1, $2)
         ON CONFLICT (inquiry_id) DO NOTHING`,
        [userId, inquiryId]
      );

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', true, duration);
      await metricsService.trackPersonaVerification(userId, inquiryId, 'created');

      logger.info('Persona inquiry created successfully', {
        userId,
        inquiryId,
        duration,
      });

      return {
        inquiryId,
        sessionToken,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', false, duration);
      
      logger.error('Error creating Persona inquiry', {
        userId,
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        duration,
      });

      throw new Error('Failed to create identity verification inquiry');
    }
  }

  /**
   * Get verification status for a user
   * @param userId - User ID from the database
   * @returns Verification status or null if not found
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus | null> {
    const startTime = Date.now();
    
    try {
      logger.debug('Fetching verification status', { userId });

      const result = await pool.query<PersonaVerification>(
        `SELECT * FROM persona_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (result.rows.length === 0) {
        logger.debug('No verification found for user', { userId });
        return null;
      }

      const verification = result.rows[0];

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', true, duration);

      logger.debug('Verification status retrieved', {
        userId,
        inquiryId: verification.inquiry_id,
        duration,
      });

      return {
        ssnVerified: verification.ssn_verified,
        selfieVerified: verification.selfie_verified,
        documentVerified: verification.document_verified,
        completedAt: verification.completed_at || undefined,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', false, duration);
      
      logger.error('Error fetching verification status', {
        userId,
        error: error.message,
        stack: error.stack,
        duration,
      });

      throw new Error('Failed to fetch verification status');
    }
  }

  /**
   * Retrieve inquiry details from Persona API
   * @param inquiryId - Persona inquiry ID
   * @returns Full inquiry object with verification details
   */
  async getInquiry(inquiryId: string): Promise<PersonaInquiry> {
    const startTime = Date.now();
    
    try {
      logger.debug('Fetching inquiry from Persona API', { inquiryId });

      const response = await this.client.get(`/inquiries/${inquiryId}`, {
        params: {
          include: 'verifications',
        },
      });

      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', true, duration);

      logger.debug('Inquiry retrieved successfully', {
        inquiryId,
        status: response.data.data.attributes.status,
        duration,
      });

      return response.data.data as PersonaInquiry;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await metricsService.trackExternalService('persona', false, duration);
      
      logger.error('Error fetching inquiry from Persona API', {
        inquiryId,
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
        duration,
      });

      throw new Error('Failed to retrieve inquiry details');
    }
  }

  /**
   * Parse verification results from inquiry
   * @param inquiry - Persona inquiry object
   * @param verifications - Array of verification reports
   * @returns Normalized verification status
   */
  private parseVerificationResults(
    inquiry: PersonaInquiry,
    verifications?: PersonaVerificationReport[]
  ): VerificationStatus {
    let ssnVerified = false;
    let selfieVerified = false;
    let documentVerified = false;

    if (verifications && verifications.length > 0) {
      for (const verification of verifications) {
        const isPassed = verification.attributes.status === 'passed';

        // Check verification type and update corresponding flag
        if (verification.type === 'verification/government-id') {
          documentVerified = isPassed;
        } else if (verification.type === 'verification/selfie') {
          selfieVerified = isPassed;
        } else if (verification.type === 'verification/database') {
          // Database verification typically includes SSN/ID number check
          ssnVerified = isPassed;
        }
      }
    }

    const isCompleted = inquiry.attributes.status === 'completed';
    const completedAt = isCompleted && inquiry.attributes['completed-at']
      ? new Date(inquiry.attributes['completed-at'])
      : undefined;

    logger.debug('Parsed verification results', {
      inquiryId: inquiry.id,
      ssnVerified,
      selfieVerified,
      documentVerified,
      completedAt,
    });

    return {
      ssnVerified,
      selfieVerified,
      documentVerified,
      completedAt,
    };
  }

  /**
   * Handle webhook event from Persona
   * @param event - Parsed webhook event
   */
  async handleWebhookEvent(event: PersonaWebhookEvent): Promise<void> {
    try {
      const eventName = event.data.attributes.name;
      const inquiry = event.data.attributes.payload.data;
      const verifications = event.data.attributes.payload.included;

      logger.info('Processing Persona webhook event', {
        eventType: eventName,
        inquiryId: inquiry.id,
        inquiryStatus: inquiry.attributes.status,
      });

      // Only process relevant events
      if (
        eventName === 'inquiry.completed' ||
        eventName === 'inquiry.failed' ||
        eventName === 'inquiry.expired'
      ) {
        // Parse verification results
        const verificationStatus = this.parseVerificationResults(inquiry, verifications);

        // Update verification status in database
        const result = await pool.query(
          `UPDATE persona_verifications 
           SET ssn_verified = $1, 
               selfie_verified = $2, 
               document_verified = $3,
               completed_at = $4,
               updated_at = NOW()
           WHERE inquiry_id = $5
           RETURNING user_id`,
          [
            verificationStatus.ssnVerified,
            verificationStatus.selfieVerified,
            verificationStatus.documentVerified,
            verificationStatus.completedAt || null,
            inquiry.id,
          ]
        );

        if (result.rows.length === 0) {
          logger.warn('No verification record found for inquiry', {
            inquiryId: inquiry.id,
          });
        } else {
          const userId = result.rows[0].user_id;
          
          // Track verification status
          if (eventName === 'inquiry.completed') {
            await metricsService.trackPersonaVerification(userId, inquiry.id, 'completed');
          } else if (eventName === 'inquiry.failed') {
            await metricsService.trackPersonaVerification(userId, inquiry.id, 'failed');
          } else if (eventName === 'inquiry.expired') {
            await metricsService.trackPersonaVerification(userId, inquiry.id, 'expired');
          }
          
          logger.info('Updated verification status from webhook', {
            inquiryId: inquiry.id,
            userId,
            eventType: eventName,
            ssnVerified: verificationStatus.ssnVerified,
            selfieVerified: verificationStatus.selfieVerified,
            documentVerified: verificationStatus.documentVerified,
          });
        }
      } else {
        logger.debug('Ignoring webhook event', {
          eventType: eventName,
          inquiryId: inquiry.id,
        });
      }
    } catch (error: any) {
      logger.error('Error handling webhook event', {
        error: error.message,
        stack: error.stack,
        eventType: event.data.attributes.name,
      });

      throw new Error('Failed to process webhook event');
    }
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   * @param payload - Raw request body
   * @param signature - Persona-Signature header value
   * @returns Parsed webhook event
   */
  verifyWebhookSignature(payload: Buffer, signature: string): PersonaWebhookEvent {
    try {
      logger.debug('Verifying webhook signature');

      // Persona uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        logger.error('Invalid webhook signature');
        throw new Error('Invalid webhook signature');
      }

      logger.debug('Webhook signature verified successfully');

      // Parse and return the event
      const event = JSON.parse(payload.toString()) as PersonaWebhookEvent;
      return event;
    } catch (error: any) {
      logger.error('Webhook signature verification failed', {
        error: error.message,
        stack: error.stack,
      });

      throw new Error('Invalid webhook signature');
    }
  }
}

// Only instantiate if Persona is enabled
export const personaService = process.env.USE_PERSONA === 'true' 
  ? new PersonaService() 
  : null as any as PersonaService;
