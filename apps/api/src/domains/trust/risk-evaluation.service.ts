import { Injectable } from '@nestjs/common';
import type { Prisma } from '@trustpay/database';
import { prisma } from '@trustpay/database';

export type RiskSeverityLevel = 'low' | 'medium' | 'high' | 'critical' | 'critical_review';

export type RiskSignalCode =
  | 'transaction.amount_unusual'
  | 'transaction.failed_payment_retries'
  | 'transaction.cancelled_protected_transaction'
  | 'transaction.velocity_high'
  | 'transaction.multiple_disputes'
  | 'transaction.refund_pattern'
  | 'transaction.amendment_before_release'
  | 'transaction.pattern_mismatch'
  | 'identity.verification_failed'
  | 'identity.repeated_verification_attempts'
  | 'identity.inconsistent_profile'
  | 'identity.duplicate_verified_signal'
  | 'business.verification_inconsistency'
  | 'seller.dispute_rate_high'
  | 'seller.refund_rate_high'
  | 'seller.non_fulfillment_pattern'
  | 'seller.late_fulfillment_pattern'
  | 'seller.profile_change_pattern'
  | 'payment.webhook_mismatch'
  | 'payment.amount_mismatch'
  | 'payment.currency_mismatch'
  | 'payment.duplicate_reference'
  | 'payment.reconciliation_mismatch';

export type RiskSignalInput = {
  userId?: string;
  businessId?: string;
  dealId?: string;
  signalType:
    | 'multiple_accounts'
    | 'suspicious_account_relationships'
    | 'repeated_failed_transactions'
    | 'unusual_activity'
    | 'dispute_patterns'
    | 'payment_mismatch'
    | 'verification_failure'
    | 'seller_risk'
    | 'refund_pattern'
    | 'amendment_pattern';
  occurrenceCount?: number;
  signalCode?: RiskSignalCode;
  source?: string;
  timestamp?: Date | string;
  metadata?: Prisma.InputJsonValue;
};

export type RiskEvaluation = {
  signalCode: RiskSignalCode;
  severity: RiskSeverityLevel;
  explanation: string;
  recommendation: string;
  source: string;
  timestamp: string;
};

export function normalizeRiskSeverity(value: number): RiskSeverityLevel {
  if (value >= 10) return 'critical_review';
  if (value >= 6) return 'critical';
  if (value >= 4) return 'high';
  if (value >= 2) return 'medium';
  return 'low';
}

export function evaluateRiskSignal(input: RiskSignalInput): RiskEvaluation {
  const count = input.occurrenceCount ?? 1;
  const signalCode = input.signalCode ?? 'transaction.pattern_mismatch';
  const source = input.source ?? 'risk-evaluation';
  const timestamp = new Date(input.timestamp ?? Date.now()).toISOString();
  const severity = normalizeRiskSeverity(count);
  const explanation = `${input.signalType.replaceAll('_', ' ')} was observed ${count} time${count === 1 ? '' : 's'}.`;

  return {
    signalCode,
    severity,
    explanation,
    recommendation:
      severity === 'low'
        ? 'Monitor for recurrence; no automated action is taken.'
        : 'Create or review a fraud case with a qualified TrustPay reviewer; no automated action is taken.',
    source,
    timestamp
  };
}

@Injectable()
export class RiskEvaluationService {
  public async evaluate(input: RiskSignalInput) {
    const evaluation = evaluateRiskSignal(input);
    const metadataBase =
      input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
        ? (input.metadata as Record<string, unknown>)
        : {};
    const duplicate = await prisma.riskSignal.findFirst({
      where: {
        ...(input.userId ? { userId: input.userId } : {}),
        ...(input.businessId ? { businessId: input.businessId } : {}),
        signalType: input.signalType,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (duplicate) {
      return {
        signal: duplicate,
        recommendation: evaluation.recommendation,
        evaluation,
        deduplicated: true
      };
    }

    const signal = await prisma.riskSignal.create({
      data: {
        userId: input.userId ?? null,
        businessId: input.businessId ?? null,
        signalType: input.signalType,
        severity: evaluation.severity === 'critical_review' ? 'critical' : evaluation.severity,
        explanation: evaluation.explanation,
        metadata: {
          ...metadataBase,
          signalCode: evaluation.signalCode,
          source: evaluation.source,
          timestamp: evaluation.timestamp,
          dealId: input.dealId ?? null
        } as Prisma.InputJsonValue
      }
    });
    return { signal, recommendation: evaluation.recommendation, evaluation, deduplicated: false };
  }

  public async createCaseFromSignal(input: RiskSignalInput) {
    const evaluation = evaluateRiskSignal(input);
    if (evaluation.severity === 'low') {
      return { created: false, reason: 'signal did not reach review threshold' };
    }

    const existing = await prisma.fraudCase.findFirst({
      where: {
        OR: [
          ...(input.userId ? [{ userId: input.userId }] : []),
          ...(input.businessId ? [{ businessId: input.businessId }] : [])
        ],
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        reason: evaluation.explanation
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      return { created: false, case: existing, reason: 'duplicate review case already exists' };
    }

    const fraudCase = await prisma.fraudCase.create({
      data: {
        userId: input.userId ?? null,
        businessId: input.businessId ?? null,
        riskLevel: evaluation.severity === 'critical_review' ? 'critical' : evaluation.severity,
        reason: evaluation.explanation,
        evidence: {
          signalCode: evaluation.signalCode,
          source: evaluation.source,
          occurrenceCount: input.occurrenceCount ?? 1,
          dealId: input.dealId ?? null,
          observedAt: evaluation.timestamp
        },
        status: 'open'
      }
    });

    return { created: true, case: fraudCase };
  }
}
