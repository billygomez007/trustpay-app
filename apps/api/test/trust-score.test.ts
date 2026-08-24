import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateTrustScore } from '../src/domains/trust/trust-score.service.js';

test('produces explainable bounded trust scores', () => {
  const result = calculateTrustScore({
    completedDeals: 10,
    cancelledDeals: 0,
    disputes: 0,
    verificationRank: 3,
    averageRating: 5,
    riskSignals: 0
  });
  assert.equal(result.score, 90);
  assert.equal(result.factors.verification, 30);
});
