import { Injectable, NotFoundException } from '@nestjs/common';
import type { MockPaymentProvider } from './mock-payment.provider.js';
import type { PaystackPaymentProvider } from './paystack-payment.provider.js';
import type { PaymentProvider } from './payment-provider.port.js';

@Injectable()
export class ProviderRegistryService {
  public constructor(
    private readonly mockProvider: MockPaymentProvider,
    private readonly paystackProvider: PaystackPaymentProvider
  ) {}

  public get(code: string): PaymentProvider {
    const normalized = code.trim().toLowerCase();
    if (normalized === this.mockProvider.code && process.env.NODE_ENV !== 'production') {
      return this.mockProvider;
    }
    if (normalized === this.paystackProvider.code) {
      if (!process.env.PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_PUBLIC_KEY) {
        throw new NotFoundException('Paystack payments are not currently configured.');
      }
      return this.paystackProvider;
    }
    throw new NotFoundException(`Payment provider "${code}" is not available.`);
  }
}
