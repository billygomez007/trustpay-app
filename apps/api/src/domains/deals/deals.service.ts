import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, type Prisma } from '@trustpay/database';
import type { DealStatus } from '@trustpay/types';
import type {
  CreateDealAmendmentInput,
  CreateDealInput,
  ReviewDealAmendmentInput,
  TransitionDealInput
} from '@trustpay/validation';
import { AuditService } from '../audit/audit.service.js';
import { NotificationService } from '../notifications/notification.service.js';
import { TenantService } from '../businesses/tenant.service.js';
import { assertActorCanTransition, assertValidTransition } from './deal-state-machine.js';

@Injectable()
export class DealsService {
  public constructor(
    @Inject(TenantService) private readonly tenantService: TenantService,
    @Inject(NotificationService) private readonly notifications: NotificationService,
    @Inject(AuditService) private readonly auditService: AuditService
  ) {}

  public async create(actorId: string, input: CreateDealInput) {
    if (input.businessId) {
      await this.tenantService.requireMembership(actorId, input.businessId, 'deal:create');
    }
    const seller = await prisma.user.findUnique({ where: { id: input.sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found.');
    }
    const deal = await prisma.$transaction(async (transaction) => {
      const created = await transaction.deal.create({
        data: {
          reference: `DL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          businessId: input.businessId ?? null,
          buyerId: actorId,
          sellerId: input.sellerId,
          type: input.type,
          title: input.title,
          description: input.description ?? null,
          amount: input.amount.amount,
          currency: input.amount.currency,
          inspectionPeriodHours: input.inspectionPeriodHours ?? null
        }
      });
      await transaction.dealParticipant.createMany({
        data: [
          { dealId: created.id, userId: actorId, role: 'buyer', acceptedAt: new Date() },
          { dealId: created.id, userId: input.sellerId, role: 'seller' }
        ]
      });
      await transaction.dealTerms.create({
        data: { dealId: created.id }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: created.id,
          actorId,
          action: 'deal.created',
          metadata: { status: created.status }
        }
      });
      return created;
    });
    await Promise.all([
      this.notifications.createInApp({
        userId: actorId,
        businessId: input.businessId,
        title: 'Your Deal has been created',
        body: `${deal.title} is ready for the next action.`,
        metadata: { dealId: deal.id }
      }),
      this.notifications.createInApp({
        userId: input.sellerId,
        businessId: input.businessId,
        title: 'A Deal requires your attention',
        body: `${deal.title} was created by a buyer.`,
        metadata: { dealId: deal.id }
      }),
      this.auditService.record({
        actorId,
        businessId: input.businessId,
        action: 'deal.created',
        resource: `deal:${deal.id}`
      })
    ]);
    return deal;
  }

  public async list(actorId: string, businessId?: string) {
    if (businessId) {
      await this.tenantService.requireMembership(actorId, businessId, 'deal:read');
      return prisma.deal.findMany({
        where: { businessId },
        include: {
          buyer: { include: { profile: true } },
          seller: { include: { profile: true } },
          order: true,
          terms: true,
          disputes: { select: { id: true, status: true, createdAt: true } },
          amendments: { select: { id: true, status: true, createdAt: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }
    return prisma.deal.findMany({
      where: { OR: [{ buyerId: actorId }, { sellerId: actorId }] },
      include: {
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        order: true,
        terms: true,
        disputes: { select: { id: true, status: true, createdAt: true } },
        amendments: { select: { id: true, status: true, createdAt: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async get(actorId: string, dealId: string) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        terms: true,
        amendments: { orderBy: { createdAt: 'desc' } },
        disputes: {
          orderBy: { createdAt: 'desc' },
          include: {
            evidence: { orderBy: { createdAt: 'asc' } },
            decisions: { orderBy: { createdAt: 'asc' } }
          }
        },
        delivery: true,
        participants: {
          orderBy: { createdAt: 'asc' }
        },
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        order: true
      }
    });
    if (!deal || (deal.buyerId !== actorId && deal.sellerId !== actorId)) {
      throw new NotFoundException('Deal not found.');
    }
    if (deal.businessId) {
      await this.tenantService.requireMembership(actorId, deal.businessId, 'deal:read');
    }
    return deal;
  }

  public async proposeAmendment(actorId: string, dealId: string, input: CreateDealAmendmentInput) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        terms: true,
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } }
      }
    });
    if (!deal || (deal.buyerId !== actorId && deal.sellerId !== actorId)) {
      throw new NotFoundException('Deal not found.');
    }
    if (deal.businessId) {
      await this.tenantService.requireMembership(actorId, deal.businessId, 'deal:read');
    }
    const amendment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.dealAmendment.create({
        data: {
          dealId,
          actorId,
          changes: {
            reason: input.reason,
            before: {
              deal: {
                title: deal.title,
                description: deal.description,
                amount: deal.amount.toString(),
                inspectionPeriodHours: deal.inspectionPeriodHours,
                status: deal.status
              },
              terms: deal.terms
            },
            proposed: {
              ...(input.title ? { title: input.title } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.amount
                ? { amount: { amount: input.amount.amount, currency: input.amount.currency } }
                : {}),
              ...(input.inspectionPeriodHours !== undefined
                ? { inspectionPeriodHours: input.inspectionPeriodHours }
                : {}),
              ...(input.deliveryExpectations !== undefined
                ? { deliveryExpectations: input.deliveryExpectations }
                : {}),
              ...(input.completionRequirements !== undefined
                ? { completionRequirements: input.completionRequirements }
                : {}),
              ...(input.cancellationRules !== undefined
                ? { cancellationRules: input.cancellationRules }
                : {}),
              ...(input.additionalNotes !== undefined
                ? { additionalNotes: input.additionalNotes }
                : {})
            }
          } as Prisma.InputJsonValue
        }
      });
      await transaction.dealEvent.create({
        data: {
          dealId,
          actorId,
          action: 'deal.amendment.proposed',
          metadata: { amendmentId: created.id }
        }
      });
      return created;
    });
    await Promise.all([
      this.notifications.createInApp({
        userId: actorId === deal.buyerId ? deal.sellerId : deal.buyerId,
        businessId: deal.businessId ?? undefined,
        title: 'Amendment proposed',
        body: `${deal.title} has a new agreement update to review.`,
        metadata: { dealId, amendmentId: amendment.id }
      }),
      this.auditService.record({
        actorId,
        businessId: deal.businessId ?? undefined,
        action: 'deal.amendment.proposed',
        resource: `deal:${dealId}`,
        metadata: { amendmentId: amendment.id }
      })
    ]);
    return amendment;
  }

  public async reviewAmendment(
    actorId: string,
    dealId: string,
    amendmentId: string,
    input: ReviewDealAmendmentInput
  ) {
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: { terms: true, buyer: true, seller: true }
    });
    if (!deal || (deal.buyerId !== actorId && deal.sellerId !== actorId)) {
      throw new NotFoundException('Deal not found.');
    }
    const amendment = await prisma.dealAmendment.findUnique({ where: { id: amendmentId } });
    if (!amendment || amendment.dealId !== dealId) {
      throw new NotFoundException('Amendment not found.');
    }
    if (amendment.actorId === actorId) {
      throw new NotFoundException('Amendment review not available.');
    }
    if (amendment.status !== 'requested') {
      throw new NotFoundException('Amendment is no longer pending.');
    }
    const before = amendment.changes as {
      proposed?: Record<string, unknown>;
      before?: { deal?: Record<string, unknown>; terms?: Record<string, unknown> | null };
      reason?: string;
    };
    const proposed = before.proposed ?? {};
    const reviewedAt = new Date();
    const updated = await prisma.$transaction(async (transaction) => {
      const dealUpdates: Prisma.DealUpdateInput = {
        ...(typeof proposed.title === 'string' ? { title: proposed.title } : {}),
        ...(typeof proposed.description === 'string' ? { description: proposed.description } : {}),
        ...(proposed.amount &&
        typeof proposed.amount === 'object' &&
        'amount' in proposed.amount &&
        'currency' in proposed.amount
          ? {
              amount: (proposed.amount as { amount: string; currency: string }).amount,
              currency: (proposed.amount as { amount: string; currency: string }).currency
            }
          : {}),
        ...(typeof proposed.inspectionPeriodHours === 'number'
          ? { inspectionPeriodHours: proposed.inspectionPeriodHours }
          : {})
      };
      const termUpdates: Prisma.DealTermsUpdateInput = {
        ...(typeof proposed.deliveryExpectations === 'string'
          ? { deliveryExpectations: proposed.deliveryExpectations }
          : {}),
        ...(typeof proposed.completionRequirements === 'string'
          ? { completionRequirements: proposed.completionRequirements }
          : {}),
        ...(typeof proposed.cancellationRules === 'string'
          ? { cancellationRules: proposed.cancellationRules }
          : {}),
        ...(typeof proposed.additionalNotes === 'string'
          ? { additionalNotes: proposed.additionalNotes }
          : {})
      };
      if (input.decision === 'accepted') {
        if (Object.keys(dealUpdates).length > 0) {
          await transaction.deal.update({
            where: { id: dealId },
            data: dealUpdates
          });
        }
        if (Object.keys(termUpdates).length > 0) {
          await transaction.dealTerms.update({
            where: { dealId },
            data: termUpdates
          });
        }
      }
      return transaction.dealAmendment.update({
        where: { id: amendmentId },
        data: {
          status: input.decision,
          changes: {
            ...before,
            reviewedAt: reviewedAt.toISOString(),
            reviewedById: actorId,
            reviewReason: input.reason,
            decision: input.decision
          } as Prisma.InputJsonValue
        }
      });
    });
    await Promise.all([
      this.notifications.createInApp({
        userId: amendment.actorId,
        businessId: deal.businessId ?? undefined,
        title: input.decision === 'accepted' ? 'Amendment accepted' : 'Amendment rejected',
        body:
          input.decision === 'accepted'
            ? 'The protected transaction agreement was updated.'
            : 'The protected transaction agreement remains unchanged.',
        metadata: {
          dealId,
          amendmentId: updated.id,
          decision: input.decision,
          reason: input.reason
        }
      }),
      this.auditService.record({
        actorId,
        businessId: deal.businessId ?? undefined,
        action: `deal.amendment.${input.decision}`,
        resource: `deal:${dealId}`,
        metadata: { amendmentId: updated.id, reason: input.reason }
      }),
      prisma.dealEvent.create({
        data: {
          dealId,
          actorId,
          action: `deal.amendment.${input.decision}`,
          metadata: { amendmentId: updated.id, reason: input.reason }
        }
      })
    ]);
    return updated;
  }

  public async transition(actorId: string, dealId: string, input: TransitionDealInput) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) {
      throw new NotFoundException('Deal not found.');
    }
    if (deal.businessId) {
      await this.tenantService.requireMembership(actorId, deal.businessId, 'deal:read');
    }
    const current = deal.status as DealStatus;
    const target = input.targetStatus as DealStatus;
    assertValidTransition(current, target);
    assertActorCanTransition({
      current,
      target,
      actorId,
      buyerId: deal.buyerId,
      sellerId: deal.sellerId
    });

    const updated = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.deal.update({
        where: { id: dealId },
        data: { status: target }
      });
      await transaction.dealEvent.create({
        data: {
          dealId,
          actorId,
          action: `deal.${target}`,
          metadata: (input.metadata ?? {}) as Prisma.InputJsonValue
        }
      });
      return changed;
    });
    const recipientId = actorId === deal.buyerId ? deal.sellerId : deal.buyerId;
    await Promise.all([
      this.notifications.createInApp({
        userId: recipientId,
        businessId: deal.businessId ?? undefined,
        title: 'Deal status updated',
        body: `${deal.title} is now ${target.replaceAll('_', ' ')}.`,
        metadata: { dealId, status: target }
      }),
      this.auditService.record({
        actorId,
        businessId: deal.businessId ?? undefined,
        action: `deal.transitioned.${target}`,
        resource: `deal:${dealId}`,
        metadata: { from: current, to: target }
      })
    ]);
    return updated;
  }

  public async events(actorId: string, dealId: string) {
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || (deal.buyerId !== actorId && deal.sellerId !== actorId)) {
      throw new NotFoundException('Deal not found.');
    }
    if (deal.businessId) {
      await this.tenantService.requireMembership(actorId, deal.businessId, 'deal:read');
    }
    return prisma.dealEvent.findMany({ where: { dealId }, orderBy: { createdAt: 'asc' } });
  }
}
