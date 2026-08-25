import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluateRiskSignal,
  normalizeRiskSeverity
} from '../src/domains/trust/risk-evaluation.service.js';
import { summarizeRiskCase, trustAiBoundaries } from '../src/domains/trust/trust-ai-assistants.js';

test('risk evaluation creates advisory high severity recommendations without enforcement', () => {
  const evaluation = evaluateRiskSignal({
    userId: 'user-1',
    signalType: 'repeated_failed_transactions',
    occurrenceCount: 5,
    signalCode: 'transaction.failed_payment_retries',
    source: 'payments'
  });
  assert.equal(evaluation.severity, 'high');
  assert.equal(evaluation.signalCode, 'transaction.failed_payment_retries');
  assert.match(evaluation.recommendation, /no automated action/i);
});

test('risk evaluation keeps explainable details and a traceable source', () => {
  const evaluation = evaluateRiskSignal({
    businessId: 'business-1',
    signalType: 'payment_mismatch',
    occurrenceCount: 3,
    signalCode: 'payment.amount_mismatch',
    source: 'reconciliation'
  });

  assert.equal(evaluation.severity, 'medium');
  assert.match(evaluation.explanation, /payment mismatch/i);
  assert.equal(evaluation.source, 'reconciliation');
  assert.ok(evaluation.timestamp);
});

test('risk severity normalizes threshold values consistently', () => {
  assert.equal(normalizeRiskSeverity(1), 'low');
  assert.equal(normalizeRiskSeverity(2), 'medium');
  assert.equal(normalizeRiskSeverity(5), 'high');
  assert.equal(normalizeRiskSeverity(10), 'critical_review');
});

test('AI summaries remain advisory and cannot execute financial actions', () => {
  const summary = summarizeRiskCase({
    caseRef: 'RISK-1001',
    reason: 'Multiple failed provider confirmations in 30 days.',
    signals: [
      {
        severity: 'high',
        signalType: 'payment_mismatch',
        explanation: 'Provider amount mismatch detected.'
      }
    ],
    transactionSummary: 'One protected deal exceeded expected amount variance.'
  });

  assert.equal(summary.advisory, true);
  assert.match(summary.summary, /human assessment/i);
  assert.ok(summary.recommendations.some((item) => item.includes('manual review')));
  assert.deepEqual(trustAiBoundaries.prohibitedActions, [
    'approve_verification',
    'reject_verification',
    'modify_trust_score',
    'close_fraud_case',
    'suspend_account'
  ]);
});
