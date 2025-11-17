import api from '../lib/api';
import { PaymentHistoryResponse, PaymentDetailsResponse, PaymentRecord } from '../types/payment.types';

/**
 * Get payment history for authenticated user
 */
export async function getPaymentHistory(): Promise<PaymentRecord[]> {
  try {
    const response = await api.get<PaymentHistoryResponse>('/sila/payment-history');
    return response.data.payments;
  } catch (error: any) {
    console.error('Error fetching payment history:', error);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch payment history');
  }
}

/**
 * Get payment details for a specific proof
 */
export async function getPaymentByProof(proofId: string): Promise<PaymentRecord> {
  try {
    const response = await api.get<PaymentDetailsResponse>(`/sila/payment/${proofId}`);
    return response.data.payment;
  } catch (error: any) {
    console.error('Error fetching payment details:', error);
    throw new Error(error.response?.data?.error?.message || 'Failed to fetch payment details');
  }
}

/**
 * Retry a failed payment
 */
export async function retryPayment(paymentId: string): Promise<PaymentRecord> {
  try {
    const response = await api.post<PaymentDetailsResponse>(`/sila/payment/${paymentId}/retry`);
    return response.data.payment;
  } catch (error: any) {
    console.error('Error retrying payment:', error);
    throw new Error(error.response?.data?.error?.message || 'Failed to retry payment');
  }
}
