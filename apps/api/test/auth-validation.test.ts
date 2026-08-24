import assert from 'node:assert/strict';
import test from 'node:test';
import { registerSchema } from '@trustpay/validation';

test('requires a strong password when registering an identity', () => {
  const result = registerSchema.safeParse({
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    password: 'too-short',
    country: 'GH'
  });
  assert.equal(result.success, false);
});
