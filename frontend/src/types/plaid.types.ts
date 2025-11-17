export interface PlaidLinkTokenResponse {
  linkToken: string;
}

export interface PlaidAccount {
  id: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  institutionName?: string;
}

export interface PlaidConnection {
  id: string;
  userId: string;
  itemId: string;
  institutionName: string;
  accounts: PlaidAccount[];
  createdAt: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface IncomeData {
  monthlyIncome: number;
  employmentMonths: number;
  employerName: string;
  employerHash: string;
}

export interface AssetsData {
  totalAssets: number;
  accounts: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
}

export interface LiabilitiesData {
  totalLiabilities: number;
  accounts: Array<{
    name: string;
    balance: number;
    type: string;
  }>;
}

export interface SignalData {
  creditScore: number;
  riskLevel: string;
}
