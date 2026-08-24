export type ProviderWebhookResult = {
  providerEventId: string;
  providerReference: string;
  eventType: 'payment.confirmed' | 'payment.failed';
  amount: string;
  currency: string;
  payload: Record<string, unknown>;
};

export interface PaymentProvider {
  readonly code: string;
  createPaymentRequest(input: {
    reference: string;
    amount: string;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: 'pending' | 'confirmed' | 'failed' }>;
  verifyWebhook(input: { signature: string | undefined; payload: unknown }): Promise<boolean>;
  normalizeWebhookEvent(payload: unknown): Promise<ProviderWebhookResult>;
  verifyTransaction(input: { reference: string }): Promise<{ success: boolean; status: string; amount: string; currency: string; providerReference: string }>;
  getTransactionStatus(input: { reference: string }): Promise<{ status: string; amount: string; currency: string; success: boolean }>;
  refundPayment?(input: {
    reference: string;
    amount: string;
    currency: string;
    reason?: string;
  }): Promise<{ providerReference: string; status: 'pending' | 'completed' | 'failed' }>;
}
