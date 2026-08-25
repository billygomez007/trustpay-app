export type AdvisoryOutput = {
  summary: string;
  recommendations: string[];
  advisory: true;
};

export type RiskAiSummaryInput = {
  caseRef?: string;
  reason?: string;
  signals?: Array<{ severity?: string; signalType?: string; explanation?: string }>;
  transactionSummary?: string;
};

export function summarizeRiskCase(input: RiskAiSummaryInput): AdvisoryOutput {
  const signals = input.signals ?? [];
  const summary = input.reason
    ? `${input.reason} Human assessment is required before any operational action.`
    : 'Trust & Safety review case requires human assessment.';
  const recommendations = [
    'Review the account and transaction history before making any operational decision.',
    'Confirm whether the evidence is consistent with the counterparty or partner context.',
    'Document the review outcome and keep all decisions auditable.'
  ];

  if (signals.length) {
    const highPriority = signals.filter((signal) =>
      (signal.severity ?? '').toLowerCase().includes('high')
    ).length;
    if (highPriority > 0) {
      recommendations.unshift(
        'Prioritize the case for manual review because multiple high-risk signals were observed.'
      );
    }
  }

  return {
    summary: [
      input.caseRef ? `Case ${input.caseRef}:` : 'Risk review case:',
      summary,
      input.transactionSummary
        ? `Transaction context: ${input.transactionSummary}`
        : 'Transaction context: review the related protected transaction record.'
    ].join(' '),
    recommendations,
    advisory: true
  };
}

export interface TrustKycAssistant {
  summarizeApplication(input: Record<string, unknown>): Promise<AdvisoryOutput>;
  identifyMissingInformation(input: Record<string, unknown>): Promise<AdvisoryOutput>;
  prepareReviewerNotes(input: Record<string, unknown>): Promise<AdvisoryOutput>;
}

export interface TrustFraudAnalyst {
  analyzeRiskSignals(input: Record<string, unknown>): Promise<AdvisoryOutput>;
  summarizeSuspiciousActivity(input: Record<string, unknown>): Promise<AdvisoryOutput>;
  prepareInvestigationSummary(input: Record<string, unknown>): Promise<AdvisoryOutput>;
}

export interface TrustAnalyst {
  explainScoreChange(input: Record<string, unknown>): Promise<AdvisoryOutput>;
  generateMerchantInsights(input: Record<string, unknown>): Promise<AdvisoryOutput>;
}

export const trustAiBoundaries = Object.freeze({
  advisoryOnly: true,
  prohibitedActions: [
    'approve_verification',
    'reject_verification',
    'modify_trust_score',
    'close_fraud_case',
    'suspend_account'
  ] as const
});
