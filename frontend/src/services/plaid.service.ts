import api from '@/lib/api';
import {
  PlaidLinkTokenResponse,
  PlaidConnection,
  IncomeData,
  AssetsData,
  LiabilitiesData,
  SignalData,
} from '@/types/plaid.types';

class PlaidService {
  /**
   * Create a Plaid Link token for initiating the OAuth flow
   */
  async createLinkToken(): Promise<string> {
    const response = await api.post<PlaidLinkTokenResponse>(
      '/plaid/create-link-token'
    );
    return response.data.linkToken;
  }

  /**
   * Exchange public token for access token after Plaid Link success
   */
  async exchangePublicToken(publicToken: string): Promise<void> {
    await api.post('/plaid/exchange', { publicToken });
  }

  /**
   * Get all linked Plaid connections for the current user
   */
  async getConnections(): Promise<PlaidConnection[]> {
    const response = await api.get<PlaidConnection[]>('/plaid/connections');
    return response.data;
  }

  /**
   * Fetch income data from Plaid
   */
  async getIncomeData(): Promise<IncomeData> {
    const response = await api.get<IncomeData>('/plaid/income');
    return response.data;
  }

  /**
   * Fetch assets data from Plaid
   */
  async getAssetsData(): Promise<AssetsData> {
    const response = await api.get<AssetsData>('/plaid/assets');
    return response.data;
  }

  /**
   * Fetch liabilities data from Plaid
   */
  async getLiabilitiesData(): Promise<LiabilitiesData> {
    const response = await api.get<LiabilitiesData>('/plaid/liabilities');
    return response.data;
  }

  /**
   * Fetch credit signal data from Plaid
   */
  async getSignalData(): Promise<SignalData> {
    const response = await api.get<SignalData>('/plaid/signal');
    return response.data;
  }
}

export const plaidService = new PlaidService();
