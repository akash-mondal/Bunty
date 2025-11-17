/**
 * Identity Verification Type Definitions
 * 
 * Provider-agnostic type definitions for identity verification.
 * These types are designed to work with any identity verification provider
 * (currently Persona, previously Stripe Identity).
 */

/**
 * Verification status for a user
 * Contains boolean flags for each verification type and completion timestamp
 */
export interface VerificationStatus {
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  completedAt?: string;
}

/**
 * Response from creating a verification session
 * Contains the inquiry/session identifier and token needed to initialize the verification flow
 */
export interface VerificationSessionResponse {
  inquiryId: string;
  sessionToken: string;
}

/**
 * Request body for creating a verification session
 * Optional reference ID can be provided for tracking purposes
 */
export interface CreateVerificationSessionRequest {
  referenceId?: string;
}
