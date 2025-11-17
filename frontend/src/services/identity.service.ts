import api from '@/lib/api';
import {
  VerificationSessionResponse,
  VerificationStatus,
  CreateVerificationSessionRequest,
} from '@/types/identity.types';

/**
 * IdentityService
 * 
 * Service class for identity verification operations.
 * Provides methods to create verification sessions and retrieve verification status.
 * This service is provider-agnostic and works with any identity verification provider
 * (currently Persona, previously Stripe Identity).
 */
class IdentityService {
  /**
   * Create an identity verification session
   * 
   * @param referenceId - Optional reference ID for tracking purposes
   * @returns Promise resolving to inquiry ID and session token
   * @throws Error if the API request fails
   */
  async createVerificationSession(
    referenceId?: string
  ): Promise<VerificationSessionResponse> {
    const payload: CreateVerificationSessionRequest = referenceId
      ? { referenceId }
      : {};
    
    const response = await api.post<VerificationSessionResponse>(
      '/identity/verification-session',
      payload
    );
    
    return response.data;
  }

  /**
   * Get verification status for the current user
   * 
   * @returns Promise resolving to verification status or null if no verification found
   * @throws Error if the API request fails (except for 404 which returns null)
   */
  async getVerificationStatus(): Promise<VerificationStatus | null> {
    try {
      const response = await api.get<VerificationStatus>(
        '/identity/verification-status'
      );
      return response.data;
    } catch (error: any) {
      // Return null if no verification found (404)
      if (error.response?.status === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }
}

// Export singleton instance
export const identityService = new IdentityService();
