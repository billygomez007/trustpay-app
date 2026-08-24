import assert from 'node:assert/strict';
import test from 'node:test';
import { MockPaymentProvider } from '../src/domains/financial/providers/mock-payment.provider.js';
import { PaystackPaymentProvider } from '../src/domains/financial/providers/paystack-payment.provider.js';
import { ProviderRegistryService } from '../src/domains/financial/providers/provider-registry.service.js';

test('Paystack fails closed when credentials are missing', async () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_PUBLIC_KEY;
  const provider = new PaystackPaymentProvider();
  await assert.rejects(
    () => provider.createPaymentRequest({ reference: 'PI-ABC', amount: '12.50', currency: 'GHS', idempotencyKey: '550e8400-e29b-41d4-a716-446655440000' }),
    /Paystack payments are not currently configured/
  );
});

test('Paystack webhook verification rejects invalid signatures', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'paystack-test-secret';
  process.env.PAYSTACK_PUBLIC_KEY = 'paystack-test-public';
  const provider = new PaystackPaymentProvider();
  const payload = { event: 'charge.success', data: { id: 13, reference: 'PI-ABC', amount: 1250, currency: 'GHS', status: 'success' } };
  const valid = await provider.verifyWebhook({ signature: 'bad-signature', payload });
  assert.equal(valid, false);
});

test('Paystack webhook normalization converts provider payload into TrustPay amounts', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'paystack-test-secret';
  process.env.PAYSTACK_PUBLIC_KEY = 'paystack-test-public';
  const provider = new PaystackPaymentProvider();
  const payload = { event: 'charge.success', data: { id: 13, reference: 'PI-ABC', amount: 1250, currency: 'GHS', status: 'success' } };
  const normalized = await provider.normalizeWebhookEvent(payload);
  assert.equal(normalized.providerEventId, '13');
  assert.equal(normalized.providerReference, 'PI-ABC');
  assert.equal(normalized.eventType, 'payment.confirmed');
  assert.equal(normalized.amount, '12.50');
  assert.equal(normalized.currency, 'GHS');
});

test('Paystack verification converts minor units before comparing amounts', async () => {
  process.env.PAYSTACK_SECRET_KEY = 'paystack-test-secret';
  process.env.PAYSTACK_PUBLIC_KEY = 'paystack-test-public';
  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response(JSON.stringify({ status: true, data: { reference: 'PI-ABC', amount: 1250, currency: 'GHS', status: 'success' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  try {
    const provider = new PaystackPaymentProvider();
    const verification = await provider.verifyTransaction({ reference: 'PI-ABC' });
    assert.equal(verification.success, true);
    assert.equal(verification.amount, '12.50');
    assert.equal(verification.currency, 'GHS');
  } finally {
    global.fetch = originalFetch;
  }
});

test('Provider registry blocks Paystack when the provider is not configured', () => {
  delete process.env.PAYSTACK_SECRET_KEY;
  delete process.env.PAYSTACK_PUBLIC_KEY;
  const registry = new ProviderRegistryService(new MockPaymentProvider(), new PaystackPaymentProvider());
  assert.throws(() => registry.get('paystack'), /Paystack payments are not currently configured/);
});
