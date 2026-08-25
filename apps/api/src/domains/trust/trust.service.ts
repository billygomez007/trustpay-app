import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, prisma } from '@trustpay/database';
import { AuditService } from '../audit/audit.service.js';
import { TenantService } from '../businesses/tenant.service.js';
import { TrustScoreService } from './trust-score.service.js';

@Injectable()
export class TrustService {
  public constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(TenantService) private readonly tenants: TenantService,
    @Inject(TrustScoreService) private readonly trustScore: TrustScoreService
  ) {}

  public async refreshProfileForUser(userId: string, verificationLevelOverride?: string) {
    const existing = await prisma.trustProfile.findUnique({ where: { userId } });
    const verificationLevel = verificationLevelOverride ?? existing?.verificationLevel ?? 'level_0';
    const profile = await prisma.trustProfile.upsert({
      where: { userId },
      create: {
        userId,
        verificationLevel,
        score: 0,
        completedDeals: 0,
        successfulDeals: 0,
        cancelledDeals: 0,
        isPublic: false
      },
      update: {
        verificationLevel,
        ...(verificationLevelOverride ? {} : {})
      }
    });
    const [completedDeals, cancelledDeals, disputeCount, riskSignalCount, averageRating] =
      await Promise.all([
        prisma.deal.count({
          where: {
            OR: [
              { buyerId: userId, status: 'completed' },
              { sellerId: userId, status: 'completed' }
            ]
          }
        }),
        prisma.deal.count({
          where: {
            OR: [
              { buyerId: userId, status: 'cancelled' },
              { sellerId: userId, status: 'cancelled' }
            ]
          }
        }),
        prisma.dealDispute.count({
          where: {
            deal: { OR: [{ buyerId: userId }, { sellerId: userId }] }
          }
        }),
        prisma.riskSignal.count({ where: { userId } }),
        prisma.review.aggregate({
          where: { revieweeId: userId, status: 'published' },
          _avg: { rating: true }
        })
      ]);
    const scoreInput = {
      completedDeals,
      cancelledDeals,
      disputes: disputeCount,
      verificationRank: this.verificationRank(verificationLevel),
      riskSignals: riskSignalCount,
      ...(averageRating._avg.rating == null
        ? {}
        : { averageRating: Number(averageRating._avg.rating) })
    };
    const result = this.trustScore.calculate(scoreInput);
    const ratingValue = averageRating._avg.rating ? Number(averageRating._avg.rating) : null;
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.trustProfile.update({
        where: { id: profile.id },
        data: {
          verificationLevel,
          score: result.score,
          completedDeals,
          successfulDeals: completedDeals,
          cancelledDeals,
          averageRating: ratingValue !== null ? new Prisma.Decimal(ratingValue.toFixed(2)) : null,
          updatedAt: new Date()
        }
      });
      await tx.trustScoreHistory.create({
        data: {
          trustProfileId: next.id,
          score: next.score,
          factors: result.factors as Prisma.InputJsonValue
        }
      });
      return next;
    });
    return updated;
  }

  public async refreshProfileForBusiness(businessId: string, verificationLevelOverride?: string) {
    const existing = await prisma.trustProfile.findUnique({ where: { businessId } });
    const verificationLevel = verificationLevelOverride ?? existing?.verificationLevel ?? 'level_0';
    const profile = await prisma.trustProfile.upsert({
      where: { businessId },
      create: {
        businessId,
        verificationLevel,
        score: 0,
        completedDeals: 0,
        successfulDeals: 0,
        cancelledDeals: 0,
        isPublic: false
      },
      update: {
        verificationLevel
      }
    });
    const [completedDeals, cancelledDeals, disputeCount, riskSignalCount, averageRating] =
      await Promise.all([
        prisma.deal.count({
          where: {
            businessId,
            status: 'completed'
          }
        }),
        prisma.deal.count({
          where: {
            businessId,
            status: 'cancelled'
          }
        }),
        prisma.dealDispute.count({
          where: {
            deal: { businessId }
          }
        }),
        prisma.riskSignal.count({ where: { businessId } }),
        prisma.review.aggregate({
          where: { businessId, status: 'published' },
          _avg: { rating: true }
        })
      ]);
    const scoreInput = {
      completedDeals,
      cancelledDeals,
      disputes: disputeCount,
      verificationRank: this.verificationRank(verificationLevel),
      riskSignals: riskSignalCount,
      ...(averageRating._avg.rating == null
        ? {}
        : { averageRating: Number(averageRating._avg.rating) })
    };
    const result = this.trustScore.calculate(scoreInput);
    const ratingValue = averageRating._avg.rating ? Number(averageRating._avg.rating) : null;
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.trustProfile.update({
        where: { id: profile.id },
        data: {
          verificationLevel,
          score: result.score,
          completedDeals,
          successfulDeals: completedDeals,
          cancelledDeals,
          averageRating: ratingValue !== null ? new Prisma.Decimal(ratingValue.toFixed(2)) : null,
          updatedAt: new Date()
        }
      });
      await tx.trustScoreHistory.create({
        data: {
          trustProfileId: next.id,
          score: next.score,
          factors: result.factors as Prisma.InputJsonValue
        }
      });
      return next;
    });
    return updated;
  }

  public async myProfile(userId: string) {
    const profile = await prisma.trustProfile.findUnique({
      where: { userId },
      include: { scoreHistory: { orderBy: { calculatedAt: 'desc' }, take: 20 } }
    });
    if (profile) return profile;
    await this.refreshProfileForUser(userId);
    return prisma.trustProfile.findUnique({
      where: { userId },
      include: { scoreHistory: { orderBy: { calculatedAt: 'desc' }, take: 20 } }
    });
  }

  private verificationRank(level: string): number {
    const match = level.match(/(\d+)/);
    const extracted = match?.[1];
    return extracted ? Number.parseInt(extracted, 10) : 0;
  }

  public async submitIdentity(
    userId: string,
    input: {
      fullName: string;
      dateOfBirth?: string | undefined;
      phone?: string | undefined;
      identityType: string;
      identityReference: string;
      country: string;
    }
  ) {
    const verification = await prisma.identityVerification.create({
      data: {
        userId,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        phone: input.phone ?? null,
        identityType: input.identityType,
        identityReference: input.identityReference,
        country: input.country,
        status: 'submitted',
        submittedAt: new Date()
      }
    });
    await this.audit.record({
      actorId: userId,
      action: 'trust.identity.submitted',
      resource: `identity-verification:${verification.id}`
    });
    return verification;
  }

  public async submitBusiness(
    userId: string,
    input: {
      businessId: string;
      registeredName?: string | undefined;
      registrationNumber?: string | undefined;
    }
  ) {
    await this.tenants.requireMembership(userId, input.businessId, 'business:manage');
    const verification = await prisma.businessVerification.create({
      data: {
        businessId: input.businessId,
        registeredName: input.registeredName ?? null,
        registrationNumber: input.registrationNumber ?? null,
        status: 'submitted',
        submittedAt: new Date()
      }
    });
    await this.audit.record({
      actorId: userId,
      businessId: input.businessId,
      action: 'trust.business.submitted',
      resource: `business-verification:${verification.id}`
    });
    return verification;
  }

  public async profile(id: string, viewerId: string) {
    const profile = await prisma.trustProfile.findUnique({
      where: { id },
      include: { scoreHistory: { orderBy: { calculatedAt: 'desc' }, take: 20 } }
    });
    if (!profile) throw new NotFoundException('Trust profile not found.');
    if (!profile.isPublic && profile.userId !== viewerId)
      throw new ForbiddenException('This Trust Profile is private.');
    return profile;
  }

  public async publicProfile(id: string) {
    const profile = await prisma.trustProfile.findUnique({
      where: { id },
      include: { user: { include: { profile: true } }, business: true }
    });
    if (!profile || !profile.isPublic)
      throw new NotFoundException('Public Trust profile not found.');
    return {
      displayName: profile.business?.name ?? profile.user?.profile?.name ?? 'TrustPay participant',
      country: profile.business?.country ?? profile.user?.profile?.country ?? null,
      verificationLevel: profile.verificationLevel,
      trustScore: profile.score,
      completedDeals: profile.completedDeals,
      averageRating: profile.averageRating?.toString() ?? null,
      memberSince: profile.createdAt
    };
  }

  public async publicProfiles(search?: string) {
    const profiles = await prisma.trustProfile.findMany({
      where: { isPublic: true },
      include: { user: { include: { profile: true } }, business: true },
      orderBy: { score: 'desc' },
      take: 50
    });
    const normalizedSearch = search?.trim().toLowerCase();
    return profiles
      .filter((profile) => {
        if (!normalizedSearch) return true;
        const name = profile.business?.name ?? profile.user?.profile?.name ?? '';
        return name.toLowerCase().includes(normalizedSearch);
      })
      .map((profile) => ({
        id: profile.id,
        displayName: profile.business?.name ?? profile.user?.profile?.name ?? 'TrustPay seller',
        country: profile.business?.country ?? profile.user?.profile?.country ?? null,
        verificationLevel: profile.verificationLevel,
        trustScore: profile.score,
        completedDeals: profile.completedDeals,
        averageRating: profile.averageRating?.toString() ?? null,
        memberSince: profile.createdAt
      }));
  }
}
