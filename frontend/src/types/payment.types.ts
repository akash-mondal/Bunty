export interface PaymentRecord {
  id: string;
  user_id: string;
  proof_id: string;
  amount: number;
  transaction_id: string | null;
  status: 'pending' | 'completed' | 'failed';
  triggered_at: string;
  completed_at: string | null;
  error_message: string | null;
  threshold?: number;
  nullifier?: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentRecord[];
}

export interface PaymentDetailsResponse {
  success: boolean;
  payment: PaymentRecord;
}
