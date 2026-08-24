import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { hasPermission, type Role } from '@trustpay/auth';
import type { Prisma } from '@trustpay/database';
import { prisma } from '@trustpay/database';
import type {
  CreateDisputeInput,
  DisputeDecisionInput,
  ProposeDisputeResolutionInput,
  ReviewDisputeResolutionInput,
  SubmitDisputeEvidenceInput,
  SubmitDisputeResponseInput
} from '@trustpay/validation';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';

@Injectable()
export class DisputesService {
  public constructor(
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(NotificationService) private readonly notifications: NotificationService
  ) {}

  public async listForParticipant(actorId: string) {
    return prisma.dealDispute.findMany({
      where: {
        OR: [{ openedById: actorId }, { deal: { buyerId: actorId } }, { deal: { sellerId: actorId } }]
      },
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
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getForParticipant(actorId: string, disputeId: string) {
    const dispute = await prisma.dealDispute.findUnique({
      where: { id: disputeId },
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
    this.assertParticipant(actorId, dispute);
    return dispute;
  }

  public async submitEvidence(actorId: string, disputeId: string, input: SubmitDisputeEvidenceInput) {
    const dispute = await prisma.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    this.assertParticipant(actorId, dispute);
    const evidence = await prisma.$transaction(async (transaction) => {
      const created = await transaction.disputeEvidence.create({
        data: {
          disputeId,
          submittedById: actorId,
          kind: input.kind,
          reference: input.reference,
          description: input.description ?? null
        }
      });
      await transaction.dealDispute.update({
        where: { id: disputeId },
        data: { status: dispute.status === 'open' ? 'under_review' : dispute.status }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: dispute.dealId,
          actorId,
          action: 'deal.dispute.evidence_submitted',
          metadata: { disputeId, evidenceId: created.id }
        }
      });
      return created;
    });
    await this.notifications.createInApp({
      userId: actorId === dispute.deal.buyerId ? dispute.deal.sellerId : dispute.deal.buyerId,
      businessId: dispute.deal.businessId ?? undefined,
      title: 'Evidence added',
      body: 'New dispute evidence has been added to your protected transaction.',
      metadata: { disputeId, evidenceId: evidence.id }
    });
    await this.audit.record({
      actorId,
      businessId: dispute.deal.businessId ?? undefined,
      action: 'dispute.evidence.submitted',
      resource: `dispute:${disputeId}`,
      metadata: { evidenceId: evidence.id }
    });
    return evidence;
  }

  public async respond(actorId: string, disputeId: string, input: SubmitDisputeResponseInput) {
    const dispute = await prisma.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    this.assertParticipant(actorId, dispute);
    if (actorId === dispute.openedById) {
      throw new ForbiddenException('The dispute opener cannot submit the counterparty response.');
    }
    const response = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.dealDispute.update({
        where: { id: disputeId },
        data: {
          responseSummary: input.response,
          responseById: actorId,
          responseAt: new Date(),
          status: dispute.status === 'open' ? 'under_review' : dispute.status
        }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: dispute.dealId,
          actorId,
          action: 'deal.dispute.response_submitted',
          metadata: { disputeId }
        }
      });
      return updated;
    });
    await this.notifications.createInApp({
      userId: dispute.openedById,
      businessId: dispute.deal.businessId ?? undefined,
      title: 'Dispute response received',
      body: 'The other party responded to your dispute.',
      metadata: { disputeId }
    });
    await this.audit.record({
      actorId,
      businessId: dispute.deal.businessId ?? undefined,
      action: 'dispute.response.submitted',
      resource: `dispute:${disputeId}`
    });
    return response;
  }

  public async proposeResolution(actorId: string, disputeId: string, input: ProposeDisputeResolutionInput) {
    const dispute = await prisma.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    this.assertParticipant(actorId, dispute);
    const proposal = {
      outcome: input.outcome,
      notes: input.notes,
      proposedById: actorId,
      proposedAt: new Date().toISOString()
    };
    const updated = await prisma.$transaction(async (transaction) => {
      const value = await transaction.dealDispute.update({
        where: { id: disputeId },
        data: {
          resolutionProposal: proposal as Prisma.InputJsonValue,
          resolutionProposedById: actorId,
          resolutionProposedAt: new Date(),
          resolutionDecision: 'pending',
          status: 'resolution_proposed'
        }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: dispute.dealId,
          actorId,
          action: 'deal.dispute.resolution_proposed',
          metadata: { disputeId, outcome: input.outcome }
        }
      });
      return value;
    });
    await this.notifications.createInApp({
      userId: actorId === dispute.deal.buyerId ? dispute.deal.sellerId : dispute.deal.buyerId,
      businessId: dispute.deal.businessId ?? undefined,
      title: 'Resolution proposal',
      body: 'A dispute resolution proposal is awaiting your response.',
      metadata: { disputeId, outcome: input.outcome }
    });
    await this.audit.record({
      actorId,
      businessId: dispute.deal.businessId ?? undefined,
      action: 'dispute.resolution.proposed',
      resource: `dispute:${disputeId}`,
      metadata: { outcome: input.outcome }
    });
    return updated;
  }

  public async reviewResolution(actorId: string, disputeId: string, input: ReviewDisputeResolutionInput) {
    const dispute = await prisma.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    this.assertParticipant(actorId, dispute);
    if (actorId === dispute.resolutionProposedById) {
      throw new ForbiddenException('The proposing party cannot decide the resolution.');
    }
    const updated = await prisma.$transaction(async (transaction) => {
      const value = await transaction.dealDispute.update({
        where: { id: disputeId },
        data: {
          resolutionDecision: input.decision,
          resolutionDecisionById: actorId,
          resolutionDecisionAt: new Date(),
          status: input.decision === 'accepted' ? 'resolved' : 'under_review'
        }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: dispute.dealId,
          actorId,
          action: input.decision === 'accepted' ? 'deal.dispute.resolution_accepted' : 'deal.dispute.resolution_rejected',
          metadata: { disputeId, reason: input.reason }
        }
      });
      return value;
    });
    await this.notifications.createInApp({
      userId: actorId === dispute.deal.buyerId ? dispute.deal.sellerId : dispute.deal.buyerId,
      businessId: dispute.deal.businessId ?? undefined,
      title: input.decision === 'accepted' ? 'Resolution accepted' : 'Resolution rejected',
      body:
        input.decision === 'accepted'
          ? 'Your dispute resolution proposal was accepted.'
          : 'Your dispute resolution proposal was rejected.',
      metadata: { disputeId }
    });
    await this.audit.record({
      actorId,
      businessId: dispute.deal.businessId ?? undefined,
      action: `dispute.resolution.${input.decision}`,
      resource: `dispute:${disputeId}`,
      metadata: { reason: input.reason }
    });
    return updated;
  }

  public async open(actorId: string, input: CreateDisputeInput) {
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) throw new NotFoundException('Deal not found.');
    if (actorId !== deal.buyerId && actorId !== deal.sellerId) {
      throw new ForbiddenException('Only Deal participants may open a dispute.');
    }
    if (['cancelled', 'refunded', 'released', 'completed'].includes(deal.status)) {
      throw new ForbiddenException('This Deal cannot be disputed.');
    }
    const existing = await prisma.dealDispute.findFirst({ where: { dealId: input.dealId, status: { not: 'resolved' } } });
    if (existing) return existing;
    const dispute = await prisma.$transaction(async (transaction) => {
      const created = await transaction.dealDispute.create({
        data: {
          dealId: input.dealId,
          openedById: actorId,
          reason: input.reason,
          description: input.description,
          status: 'open'
        }
      });
      await transaction.deal.update({ where: { id: input.dealId }, data: { status: 'disputed' } });
      await transaction.dealEvent.create({ data: { dealId: input.dealId, actorId, action: 'deal.dispute.opened', metadata: { disputeId: created.id } } });
      return created;
    });
    await Promise.all([
      this.notifications.createInApp({
        userId: actorId === deal.buyerId ? deal.sellerId : deal.buyerId,
        businessId: deal.businessId ?? undefined,
        title: 'Dispute opened',
        body: `${deal.title} is now under review.`,
        metadata: { dealId: input.dealId, disputeId: dispute.id }
      }),
      this.notifications.createInApp({
        userId: actorId,
        businessId: deal.businessId ?? undefined,
        title: 'Dispute received',
        body: 'Your dispute was created and is awaiting review.',
        metadata: { dealId: input.dealId, disputeId: dispute.id }
      })
    ]);
    await this.audit.record({ actorId, businessId: deal.businessId ?? undefined, action: 'dispute.opened', resource: `dispute:${dispute.id}` });
    return dispute;
  }

  public async decide(actorId: string, disputeId: string, input: DisputeDecisionInput) {
    await this.requireDisputeReviewer(actorId);
    const dispute = await prisma.dealDispute.findUnique({ where: { id: disputeId }, include: { deal: true } });
    if (!dispute) throw new NotFoundException('Dispute not found.');
    if (actorId === dispute.deal.buyerId || actorId === dispute.deal.sellerId) {
      throw new ForbiddenException('A dispute participant cannot decide the dispute.');
    }
    if (!['open', 'under_review', 'resolution_proposed'].includes(dispute.status)) {
      throw new ForbiddenException('Dispute is not awaiting a decision.');
    }
    const decision = await prisma.$transaction(async (transaction) => {
      const created = await transaction.disputeDecision.create({
        data: { disputeId, reviewerId: actorId, outcome: input.outcome, reason: input.reason }
      });
      await transaction.dealDispute.update({
        where: { id: disputeId },
        data: { status: 'decided', resolutionDecision: input.outcome, resolutionDecisionById: actorId, resolutionDecisionAt: new Date() }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: dispute.dealId,
          actorId,
          action: 'deal.dispute.decided',
          metadata: { disputeId, decisionId: created.id, outcome: input.outcome }
        }
      });
      return created;
    });
    await this.audit.record({
      actorId,
      businessId: dispute.deal.businessId ?? undefined,
      action: `dispute.decided.${input.outcome}`,
      resource: `dispute:${disputeId}`,
      metadata: { decisionId: decision.id, reason: input.reason }
    });
    return decision;
  }

  private assertParticipant(actorId: string, dispute: { openedById: string; deal: { buyerId: string; sellerId: string } }) {
    if (actorId !== dispute.openedById && actorId !== dispute.deal.buyerId && actorId !== dispute.deal.sellerId) {
      throw new ForbiddenException('Only dispute participants may access this case.');
    }
  }

  private async requireDisputeReviewer(userId: string) {
    const assignments = await prisma.staffRoleAssignment.findMany({ where: { userId } });
    if (!hasPermission(assignments.map((item) => item.role as Role), 'dispute:review')) {
      throw new ForbiddenException('Dispute review permission required.');
    }
  }
}
