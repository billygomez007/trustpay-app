import assert from 'node:assert/strict';
import test from 'node:test';
import {
  proposeDisputeResolutionSchema,
  reviewDisputeResolutionSchema,
  submitDisputeResponseSchema
} from '@trustpay/validation';

test('dispute responses require substantive text', () => {
  assert.throws(() => submitDisputeResponseSchema.parse({ response: 'ok' }));
  assert.doesNotThrow(() =>
    submitDisputeResponseSchema.parse({ response: 'The issue has been resolved on our side.' })
  );
});

test('dispute resolution proposals require a supported outcome', () => {
  assert.doesNotThrow(() =>
    proposeDisputeResolutionSchema.parse({
      outcome: 'refund',
      notes: 'Please refund the customer in full.'
    })
  );
  assert.throws(() =>
    proposeDisputeResolutionSchema.parse({ outcome: 'close', notes: 'Close the dispute.' })
  );
});

test('resolution reviews only allow accepted or rejected decisions', () => {
  assert.doesNotThrow(() =>
    reviewDisputeResolutionSchema.parse({ decision: 'accepted', reason: 'Agreed by both sides.' })
  );
  assert.throws(() =>
    reviewDisputeResolutionSchema.parse({ decision: 'pending', reason: 'Waiting' })
  );
});
