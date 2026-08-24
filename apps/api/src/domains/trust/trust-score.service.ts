import { Injectable } from '@nestjs/common';

export function calculateTrustScore(input: {
  completedDeals: number;
  cancelledDeals: number;
  disputes: number;
  verificationRank: number;
  averageRating?: number;
  riskSignals: number;
}): { score: number; factors: Record<string, number> } {
  const factors = {
    completedDeals: Math.min(input.completedDeals * 3, 30),
    verification: Math.min(input.verificationRank * 10, 30),
    ratings: input.averageRating ? Math.round(input.averageRating * 6) : 0,
    cancellations: -Math.min(input.cancelledDeals * 4, 20),
    disputes: -Math.min(input.disputes * 8, 30),
    riskSignals: -Math.min(input.riskSignals * 10, 30)
  };
  return {
    score: Math.max(
      0,
      Math.min(
        100,
        Object.values(factors).reduce((sum, value) => sum + value, 0)
      )
    ),
    factors
  };
}

@Injectable()
export class TrustScoreService {
  public calculate(input: Parameters<typeof calculateTrustScore>[0]) {
    return calculateTrustScore(input);
  }
}
