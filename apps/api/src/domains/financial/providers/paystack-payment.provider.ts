import { BadRequestException } from '@nestjs/common';
import crypto from 'node:crypto';
import type { PaymentProvider } from './payment-provider.port.js';

export type NormalizedProviderWebhook = {
  providerEventId: string;
  providerReference: string;
  eventType: 'payment.confirmed' | 'payment.failed';
  amount: string;
  currency: string;
  payload: Record<string, unknown>;
};

export class PaystackPaymentProvider implements PaymentProvider {
  public readonly code = 'paystack';

  private readonly apiBaseUrl = process.env.PAYSTACK_API_BASE_URL ?? 'https://api.paystack.co';

  public async createPaymentRequest(input: {
    reference: string;
    amount: string;
    currency: string;
    idempotencyKey: string;
  }): Promise<{ providerReference: string; status: 'pending' }> {
    this.requireConfiguration();
    const amountMinor = toMinorUnits(input.amount, input.currency);
    const response = await fetch(`${this.apiBaseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Number(amountMinor),
        currency: input.currency,
        reference: input.reference,
        metadata: {
          idempotencyKey: input.idempotencyKey,
          provider: 'paystack'
        }
      })
    });
    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { reference?: string };
    };
    if (!response.ok || !payload.status || !payload.data?.reference) {
      throw new Error(payload.message ?? 'Paystack payment initialization failed.');
    }
    return { providerReference: payload.data.reference, status: 'pending' };
  }

  public async verifyWebhook(input: {
    signature: string | undefined;
    payload: unknown;
  }): Promise<boolean> {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret || !input.payload || !input.signature) return false;
    const expected = createPaystackWebhookSignature(secret, input.payload);
    return safeCompare(expected, input.signature);
  }

  public async normalizeWebhookEvent(payload: unknown): Promise<NormalizedProviderWebhook> {
    const event = asRecord(payload);
    if (!event) {
      throw new BadRequestException('Invalid Paystack webhook payload.');
    }
    const data = asRecord(event.data);
    if (!data) {
      throw new BadRequestException('Invalid Paystack webhook payload.');
    }
    const reference = String(data.reference ?? '').trim();
    const providerEventId = String(data.id ?? `${event.event ?? 'paystack'}:${reference}`);
    const status = String(data.status ?? '').toLowerCase();
    const currency = String(data.currency ?? 'GHS').toUpperCase();
    const amount = toDecimalString(String(data.amount ?? '0'));
    if (!reference) {
      throw new BadRequestException('Paystack webhook does not include a transaction reference.');
    }
    return {
      providerEventId,
      providerReference: reference,
      eventType: status === 'success' ? 'payment.confirmed' : 'payment.failed',
      amount,
      currency,
      payload: event as Record<string, unknown>
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
    const reference = String(input.reference ?? '').trim();
    if (!reference) {
      throw new BadRequestException('Missing Paystack transaction reference.');
    }
    this.requireConfiguration();
    const response = await fetch(
      `${this.apiBaseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
      }
    );
    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { reference?: string; status?: string; amount?: number | string; currency?: string };
    };
    if (!response.ok || !payload.status || !payload.data) {
      throw new Error(payload.message ?? 'Paystack transaction verification failed.');
    }
    const data = payload.data;
    return {
      success: data.status === 'success',
      status: data.status ?? 'pending',
      amount: toDecimalString(String(data.amount ?? '0')),
      currency: String(data.currency ?? 'GHS').toUpperCase(),
      providerReference: String(data.reference ?? reference)
    };
  }

  public async getTransactionStatus(input: {
    reference: string;
  }): Promise<{ status: string; amount: string; currency: string; success: boolean }> {
    const verification = await this.verifyTransaction(input);
    return {
      status: verification.status,
      amount: verification.amount,
      currency: verification.currency,
      success: verification.success
    };
  }

  public async refundPayment(input: {
    reference: string;
    amount: string;
    currency: string;
    reason?: string;
  }): Promise<{ providerReference: string; status: 'pending' | 'completed' | 'failed' }> {
    this.requireConfiguration();
    const response = await fetch(`${this.apiBaseUrl}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transaction: input.reference,
        amount: Number(toMinorUnits(input.amount, input.currency)),
        currency: input.currency,
        reason: input.reason ?? 'TrustPay refund request'
      })
    });
    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { reference?: string; status?: string };
    };
    if (!response.ok || !payload.status || !payload.data?.reference) {
      throw new Error(payload.message ?? 'Paystack refund request failed.');
    }
    return {
      providerReference: payload.data.reference,
      status: payload.data.status === 'success' ? 'completed' : 'pending'
    };
  }

  private requireConfiguration(): void {
    if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
      throw new Error('Paystack payments are not currently configured.');
    }
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function createPaystackWebhookSignature(secret: string, payload: unknown): string {
  return crypto.createHmac('sha512', secret).update(JSON.stringify(payload)).digest('hex');
}

function safeCompare(expected: string, actual: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function toMinorUnits(amount: string, currency: string): bigint {
  const normalized = String(amount ?? '0').trim();
  const [whole = '0', fraction = ''] = normalized.split('.');
  const minor =
    currency && ['GHS', 'NGN', 'KES', 'UGX', 'TZS', 'XOF', 'XAF'].includes(currency.toUpperCase())
      ? 2
      : 2;
  void minor;
  const digits = `${whole}${fraction.padEnd(2, '0').slice(0, 2)}`;
  return BigInt(digits || '0');
}

function toDecimalString(value: string): string {
  const safe = String(value ?? '0').trim();
  const parsed = BigInt(safe);
  const whole = parsed / 100n;
  const fraction = parsed % 100n;
  return `${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
}
