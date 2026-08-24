import assert from 'node:assert/strict';
import test from 'node:test';
import { createDealSchema } from '../src/index.js';

test('accepts a valid deal request', () => {
  const result = createDealSchema.safeParse({
    buyerId: 'f08b0ed9-05ba-41a4-b7c3-4d6b9f76f8a9',
    sellerId: '5164d17b-663a-427f-924d-440a9cddc64e',
    type: 'physical_product',
    title: 'Verified laptop sale',
    amount: { amount: '500.00', currency: 'GHS' }
  });

  assert.equal(result.success, true);
});

test('rejects non-ISO currencies', () => {
  const result = createDealSchema.safeParse({
    buyerId: 'f08b0ed9-05ba-41a4-b7c3-4d6b9f76f8a9',
    sellerId: '5164d17b-663a-427f-924d-440a9cddc64e',
    type: 'service',
    title: 'Design consultation',
    amount: { amount: '250', currency: 'ghs' }
  });

  assert.equal(result.success, false);
});
