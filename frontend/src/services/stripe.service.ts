import api from '@/lib/api';
import {
  IdentitySessionResponse,
  VerificationStatus,
  CreateIdentitySessionRequest,
} from '@/types/stripe.types';

class StripeService {
  /**
   * Create a Stripe Identity verification session
   */
  async createIdentitySession(
    returnUrl?: string
  ): Promise<IdentitySessionResponse> {
    const payload: CreateIdentitySessionRequest = returnUrl
      ? { returnUrl }
      : {};
    const response = await api.post<IdentitySessionResponse>(
      '/stripe/identity-session',
      payload
    );
    return response.data;
  }

  /**
   * Get verification status for the current user
   */
  async getVerificationStatus(): Promise<VerificationStatus | null> {
    try {
      const response = await api.get<VerificationStatus>(
        '/stripe/verification-status'
      );
      return response.data;
    } catch (error: any) {
      // Return null if no verification found (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const stripeService = new StripeService();
