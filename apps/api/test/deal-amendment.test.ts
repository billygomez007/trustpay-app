import assert from 'node:assert/strict';
import test from 'node:test';
import { createDealAmendmentSchema, reviewDealAmendmentSchema } from '@trustpay/validation';

test('amendment proposals require at least one change', () => {
  assert.throws(() => createDealAmendmentSchema.parse({ reason: 'Update terms' }));
});

test('amendment proposals accept a material agreement change', () => {
  const amendment = createDealAmendmentSchema.parse({
    reason: 'Extend the completion deadline',
    inspectionPeriodHours: 72
  });
  assert.equal(amendment.inspectionPeriodHours, 72);
});

test('amendment reviews only allow accepted or rejected decisions', () => {
  assert.doesNotThrow(() =>
    reviewDealAmendmentSchema.parse({ decision: 'accepted', reason: 'Approved' })
  );
  assert.throws(() => reviewDealAmendmentSchema.parse({ decision: 'pending', reason: 'Pending' }));
});
