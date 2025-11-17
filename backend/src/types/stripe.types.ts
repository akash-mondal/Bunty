/**
 * @deprecated This file is deprecated and will be removed in a future release.
 * Stripe Identity has been replaced with Persona for identity verification.
 * Use types from persona.types.ts instead.
 * 
 * This file is kept temporarily for rollback capability only.
 * Removal planned after 2-week stabilization period.
 */

/**
 * @deprecated Use PersonaVerification from persona.types.ts instead
 */
export interface StripeVerification {
  id: string;
  user_id: string;
  session_id: string;
  ssn_verified: boolean;
  selfie_verified: boolean;
  document_verified: boolean;
  completed_at: Date | null;
  created_at: Date;
}

export interface VerificationStatus {
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  completedAt?: Date;
}

/**
 * @deprecated Use CreateVerificationSessionRequest from persona.types.ts instead
 */
export interface CreateIdentitySessionRequest {
  returnUrl?: string;
}

/**
 * @deprecated Use VerificationSessionResponse from persona.types.ts instead
 */
export interface IdentitySessionResponse {
  sessionId: string;
  clientSecret: string;
}

/**
 * @deprecated Use PersonaWebhookEvent from persona.types.ts instead
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}
