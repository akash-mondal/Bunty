export interface SilaWallet {
  id: string;
  user_id: string;
  wallet_address: string;
  bank_account_linked: boolean;
  created_at: Date;
}

export interface RegisterUserRequest {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  dateOfBirth: string; // YYYY-MM-DD format
  ssn: string; // Last 4 digits
}

export interface RegisterUserResponse {
  success: boolean;
  message: string;
  userHandle: string;
  walletAddress: string;
}

export interface LinkBankRequest {
  accountNumber: string;
  routingNumber: string;
  accountName: string;
  accountType: 'checking' | 'savings';
}

export interface LinkBankResponse {
  success: boolean;
  message: string;
  accountName: string;
}

export interface IssueWalletRequest {
  amount?: number;
}

export interface IssueWalletResponse {
  success: boolean;
  message: string;
  walletAddress: string;
  balance: number;
}

export interface TransferRequest {
  destination: string;
  amount: number;
  descriptor?: string;
}

export interface TransferResponse {
  success: boolean;
  message: string;
  transactionId: string;
  status: string;
}

export interface SilaWebhookEvent {
  eventType: string;
  transactionId: string;
  status: string;
  amount?: number;
  timestamp: string;
}

export interface GetBalanceResponse {
  success: boolean;
  balance: number;
  walletAddress: string;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  proof_id: string;
  amount: number;
  transaction_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  triggered_at: Date;
  completed_at: Date | null;
  error_message: string | null;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentRecord[];
}

export interface AutomatedPaymentRequest {
  userId: string;
  proofId: string;
  threshold: number;
}
