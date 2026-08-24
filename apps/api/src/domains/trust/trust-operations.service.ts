import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hasPermission, type Permission, type Role } from '@trustpay/auth';
import { Prisma, prisma } from '@trustpay/database';
import { AuditService } from '../audit/audit.service.js';
import { TrustService } from './trust.service.js';

@Injectable()
export class TrustOperationsService {
  public constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(TrustService) private readonly trust: TrustService
  ) {}

  public async requirePermission(userId: string, permission: Permission): Promise<void> {
    const assignments = await prisma.staffRoleAssignment.findMany({ where: { userId } });
    if (
      !hasPermission(
        assignments.map((item) => item.role as Role),
        permission
      )
    ) {
      throw new ForbiddenException('You do not have this Trust Operations permission.');
    }
  }

  public async listVerifications(userId: string) {
    await this.requirePermission(userId, 'trust.verification.view');
    return prisma.identityVerification.findMany({ orderBy: { createdAt: 'asc' }, take: 100 });
  }

  public async review(userId: string, id: string, status: 'verified' | 'rejected', reason: string) {
    await this.requirePermission(
      userId,
      status === 'verified' ? 'trust.verification.approve' : 'trust.verification.reject'
    );
    const verification = await prisma.identityVerification.findUnique({ where: { id } });
    if (!verification) throw new NotFoundException('Verification not found.');
    const updated = await prisma.identityVerification.update({
      where: { id },
      data: { status, reviewedAt: new Date(), reviewerId: userId }
    });
    await this.audit.record({
      actorId: userId,
      action: `trust.identity.${status}`,
      resource: `identity-verification:${id}`,
      metadata: { reason }
    });
    await this.trust.refreshProfileForUser(verification.userId, status === 'verified' ? 'level_1' : 'level_0');
    return updated;
  }

  public async listRiskSignals(userId: string) {
    await this.requirePermission(userId, 'trust.fraud.view');
    return prisma.riskSignal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    });
  }

  public async listFraudCases(userId: string) {
    await this.requirePermission(userId, 'trust.fraud.view');
    return prisma.fraudCase.findMany({
      include: {
        user: { select: { id: true, email: true } },
        business: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  public async listDisputes(userId: string) {
    await this.requirePermission(userId, 'dispute:review');
    return prisma.dealDispute.findMany({
      include: {
        deal: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } }
          }
        },
        evidence: { orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  public async dispute(userId: string, id: string) {
    await this.requirePermission(userId, 'dispute:review');
    const dispute = await prisma.dealDispute.findUnique({
      where: { id },
      include: {
        deal: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } },
            events: { orderBy: { createdAt: 'asc' } }
          }
        },
        evidence: {
          include: { submittedBy: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' }
        },
        decisions: {
          include: { reviewer: { include: { profile: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    return dispute;
  }

  public async listBusinessVerifications(userId: string) {
    await this.requirePermission(userId, 'trust.verification.view');
    return prisma.businessVerification.findMany({
      include: {
        business: { select: { id: true, name: true } },
        history: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'asc' },
      take: 100
    });
  }

  public async businessVerification(userId: string, id: string) {
    await this.requirePermission(userId, 'trust.verification.view');
    const verification = await prisma.businessVerification.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true } },
        history: { orderBy: { createdAt: 'asc' } }
      }
    });
    if (!verification) throw new NotFoundException('Business verification not found.');
    return verification;
  }

  public async reviewBusiness(
    userId: string,
    id: string,
    status: 'verified' | 'rejected' | 'more_information_required',
    reason: string
  ) {
    await this.requirePermission(
      userId,
      status === 'verified' ? 'trust.verification.approve' : 'trust.verification.reject'
    );
    const verification = await prisma.businessVerification.findUnique({ where: { id } });
    if (!verification) throw new NotFoundException('Business verification not found.');
    const updated = await prisma.$transaction(async (tx) => {
      const value = await tx.businessVerification.update({
        where: { id },
        data: {
          status,
          reviewedAt: new Date(),
          reviewerId: userId,
          decisionReason: reason
        }
      });
      await tx.businessVerificationHistory.create({
        data: { businessVerificationId: id, actorId: userId, status, reason }
      });
      return value;
    });
    await this.audit.record({
      actorId: userId,
      businessId: verification.businessId,
      action: `trust.business.${status}`,
      resource: `business-verification:${id}`,
      metadata: { reason }
    });
    await this.trust.refreshProfileForBusiness(
      verification.businessId,
      status === 'verified' ? 'level_2' : 'level_0'
    );
    return updated;
  }

  public async fraudCase(userId: string, id: string) {
    await this.requirePermission(userId, 'trust.fraud.view');
    const fraudCase = await prisma.fraudCase.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true } },
        business: { select: { id: true, name: true } }
      }
    });
    if (!fraudCase) throw new NotFoundException('Fraud case not found.');

    const signals = await prisma.riskSignal.findMany({
      where: {
        OR: [
          ...(fraudCase.userId ? [{ userId: fraudCase.userId }] : []),
          ...(fraudCase.businessId ? [{ businessId: fraudCase.businessId }] : [])
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return { ...fraudCase, signals };
  }

  public async createFraudCase(
    userId: string,
    input: {
      userId?: string | undefined;
      businessId?: string | undefined;
      riskLevel: 'low' | 'medium' | 'high' | 'critical' | 'critical_review';
      reason: string;
      evidence?: Record<string, unknown> | undefined;
    }
  ) {
    await this.requirePermission(userId, 'trust.fraud.manage');
    const fraudCase = await prisma.fraudCase.create({
      data: {
        userId: input.userId ?? null,
        businessId: input.businessId ?? null,
        riskLevel: input.riskLevel === 'critical_review' ? 'critical' : input.riskLevel,
        reason: input.reason,
        evidence: input.evidence ? (input.evidence as Prisma.InputJsonValue) : Prisma.JsonNull,
        assignedReviewerId: userId
      }
    });
    await this.audit.record({
      actorId: userId,
      businessId: input.businessId,
      action: 'trust.fraud.created',
      resource: `fraud-case:${fraudCase.id}`,
      metadata: { reason: input.reason }
    });
    return fraudCase;
  }

  public async updateFraudCase(
    userId: string,
    id: string,
    input: {
      status?: 'open' | 'investigating' | 'under_review' | 'more_information_required' | 'resolved' | 'cleared' | 'action_required' | 'dismissed' | 'closed' | undefined;
      assignedReviewerId?: string | null | undefined;
      investigationNotes?: string | undefined;
      evidence?: Record<string, unknown> | undefined;
    }
  ) {
    await this.requirePermission(userId, 'trust.fraud.manage');
    const existing = await prisma.fraudCase.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Fraud case not found.');
    const data: Prisma.FraudCaseUpdateInput = {
      ...(input.status ? { status: input.status } : {}),
      ...(input.assignedReviewerId !== undefined
        ? { assignedReviewerId: input.assignedReviewerId }
        : {}),
      ...(input.investigationNotes ? { investigationNotes: input.investigationNotes } : {}),
      ...(input.evidence ? { evidence: input.evidence as Prisma.InputJsonValue } : {})
    };
    const fraudCase = await prisma.fraudCase.update({
      where: { id },
      data
    });
    await this.audit.record({
      actorId: userId,
      businessId: fraudCase.businessId ?? undefined,
      action: 'risk.case.updated',
      resource: `fraud-case:${id}`,
      metadata: {
        status: input.status ?? null,
        reviewerAssigned: input.assignedReviewerId !== undefined,
        notesAdded: Boolean(input.investigationNotes),
        evidenceUpdated: Boolean(input.evidence)
      }
    });
    return fraudCase;
  }
}
