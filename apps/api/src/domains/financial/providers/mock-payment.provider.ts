import { Injectable } from '@nestjs/common';
import type { PaymentProvider, ProviderWebhookResult } from './payment-provider.port.js';

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  public readonly code = 'mock';

  public async createPaymentRequest(input: {
    reference: string;
    amount: string;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: 'pending' }> {
    return {
      providerReference: `mock_${input.reference}_${input.idempotencyKey}`,
      status: 'pending'
    };
  }

  public async verifyWebhook(input: {
    signature: string | undefined;
    payload: unknown;
  }): Promise<boolean> {
    return input.signature === process.env.PAYMENT_PROVIDER_WEBHOOK_SECRET;
  }

  public async normalizeWebhookEvent(payload: unknown): Promise<ProviderWebhookResult> {
    const entry =
      typeof payload === 'object' && payload ? (payload as Record<string, unknown>) : {};
    const providerEventId = String(entry.providerEventId ?? entry.id ?? 'mock-webhook');
    const providerReference = String(entry.providerReference ?? entry.reference ?? 'MOCK_REF');
    const eventType =
      String(entry.eventType ?? 'payment.confirmed') === 'payment.failed'
        ? 'payment.failed'
        : 'payment.confirmed';
    return {
      providerEventId,
      providerReference,
      eventType,
      amount: String(entry.amount ?? '0.00'),
      currency: String(entry.currency ?? 'GHS').toUpperCase(),
      payload: entry
    };
  }

  public async verifyTransaction(input: {
    reference: string;
  }): Promise<{
    success: boolean;
    status: string;
    amount: string;
    currency: string;
    providerReference: string;
  }> {
    return {
      success: true,
      status: 'success',
      amount: '0.00',
      currency: 'GHS',
      providerReference: input.reference
    };
  }

  public async getTransactionStatus(input: {
    reference: string;
  }): Promise<{ status: string; amount: string; currency: string; success: boolean }> {
    void input.reference;
    return {
      status: 'success',
      amount: '0.00',
      currency: 'GHS',
      success: true
    };
  }

  public async refundPayment(input: {
    reference: string;
    amount: string;
    currency: string;
    reason?: string;
  }): Promise<{ providerReference: string; status: 'pending' | 'completed' | 'failed' }> {
    return {
      providerReference: input.reference,
      status: 'pending'
    };
  }
}
