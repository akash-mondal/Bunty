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

export interface CreateIdentitySessionRequest {
  returnUrl?: string;
}

export interface IdentitySessionResponse {
  sessionId: string;
  clientSecret: string;
}

export interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
}
