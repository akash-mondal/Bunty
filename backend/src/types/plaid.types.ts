export interface PlaidConnection {
  id: string;
  user_id: string;
  access_token_encrypted: string;
  item_id: string;
  institution_name: string | null;
  created_at: Date;
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
