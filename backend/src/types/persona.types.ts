/**
 * Persona Identity Verification Type Definitions
 * 
 * This file contains TypeScript type definitions for Persona API integration,
 * including database models, API request/response types, and webhook event types.
 */

/**
 * Database model for persona_verifications table
 */
export interface PersonaVerification {
  id: string;
  user_id: string;
  inquiry_id: string;
  ssn_verified: boolean;
  selfie_verified: boolean;
  document_verified: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Verification status interface - compatible with witness service
 * This interface matches the existing VerificationStatus format used by witness.service.ts
 */
export interface VerificationStatus {
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  completedAt?: Date;
}

/**
 * Request body for creating a verification session
 */
export interface CreateVerificationSessionRequest {
  referenceId?: string;
}

/**
 * Response from creating a verification session
 */
export interface VerificationSessionResponse {
  inquiryId: string;
  sessionToken: string;
}

/**
 * Response from creating a Persona inquiry (internal service response)
 * Alias for VerificationSessionResponse for backward compatibility
 */
export interface InquiryResponse {
  inquiryId: string;
  sessionToken: string;
}

/**
 * Persona webhook event structure
 * Based on Persona's webhook event format
 */
export interface PersonaWebhookEvent {
  data: {
    type: 'event';
    id: string;
    attributes: {
      name: string;
      payload: {
        data: PersonaInquiry;
        included?: PersonaVerificationReport[];
      };
    };
  };
}

/**
 * Persona inquiry object
 * Represents the main inquiry resource from Persona API
 */
export interface PersonaInquiry {
  type: 'inquiry';
  id: string;
  attributes: {
    status: 'created' | 'pending' | 'completed' | 'failed' | 'expired' | 'needs_review' | 'approved' | 'declined';
    'reference-id'?: string;
    'created-at': string;
    'completed-at'?: string;
    'started-at'?: string;
    'failed-at'?: string;
    'expired-at'?: string;
    'redacted-at'?: string;
    'fields'?: Record<string, any>;
  };
  relationships?: {
    verifications?: {
      data: Array<{ type: string; id: string }>;
    };
    reports?: {
      data: Array<{ type: string; id: string }>;
    };
    sessions?: {
      data: Array<{ type: string; id: string }>;
    };
  };
}

/**
 * Persona verification report
 * Represents individual verification checks (government ID, selfie, database checks)
 */
export interface PersonaVerificationReport {
  type: 'verification/government-id' | 'verification/selfie' | 'verification/database' | string;
  id: string;
  attributes: {
    status: 'passed' | 'failed' | 'requires_retry' | 'canceled' | 'pending';
    'created-at': string;
    'completed-at'?: string;
    'submitted-at'?: string;
    'redacted-at'?: string;
    'checks'?: Array<{
      name: string;
      status: 'passed' | 'failed' | 'not_applicable' | 'requires_retry';
      reasons?: string[];
      metadata?: Record<string, any>;
    }>;
  };
}

/**
 * Persona API configuration
 */
export interface PersonaConfig {
  apiKey: string;
  environment: 'sandbox' | 'production';
  templateId: string;
  webhookSecret: string;
}

/**
 * Response from creating a Persona inquiry
 */
export interface PersonaInquiryResponse {
  data: PersonaInquiry;
  included?: PersonaVerificationReport[];
}

/**
 * Response from retrieving a Persona inquiry with included resources
 */
export interface PersonaInquiryDetailResponse {
  data: PersonaInquiry;
  included?: Array<PersonaVerificationReport | PersonaSession>;
}

/**
 * Persona session object
 */
export interface PersonaSession {
  type: 'session';
  id: string;
  attributes: {
    'session-token': string;
    'created-at': string;
    'expired-at'?: string;
  };
}

/**
 * Error response from Persona API
 */
export interface PersonaErrorResponse {
  errors: Array<{
    title: string;
    detail: string;
    code?: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
  }>;
}
