export interface PlaidConnection {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  item_id: string;
  institution_name: string | null;
  created_at: Date;
}

export interface PlaidConnectionResponse {
  id: string;
  userId: string;
  itemId: string;
  institutionName: string;
  accounts: Array<{
    id: string;
    name: string;
    mask: string;
    type: string;
    subtype: string;
    institutionName?: string;
  }>;
  createdAt: Date;
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
    accountId: string;
    balance: number;
    type: string;
  }>;
}

export interface LiabilitiesData {
  totalLiabilities: number;
  accounts: Array<{
    accountId: string;
    balance: number;
    type: string;
  }>;
}

export interface SignalData {
  creditScore: number;
  riskScore: number;
}

export interface InvestmentsData {
  totalValue: number;
  holdings: Array<{
    securityId: string;
    quantity: number;
    value: number;
  }>;
}

export interface TransactionsData {
  transactions: Array<{
    transactionId: string;
    amount: number;
    date: string;
    merchantName: string;
    category: string[];
  }>;
  totalCount: number;
}
