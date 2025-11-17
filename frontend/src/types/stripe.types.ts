export interface VerificationStatus {
  ssnVerified: boolean;
  selfieVerified: boolean;
  documentVerified: boolean;
  completedAt?: string;
}

export interface IdentitySessionResponse {
  sessionId: string;
  clientSecret: string;
}

export interface CreateIdentitySessionRequest {
  returnUrl?: string;
}
