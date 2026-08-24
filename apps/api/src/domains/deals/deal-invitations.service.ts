import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '@trustpay/database';
import type { AuditService } from '../audit/audit.service.js';
import type { TenantService } from '../businesses/tenant.service.js';
import type { NotificationService } from '../notifications/notification.service.js';

export type CreateDealInvitationInput = {
  dealId: string;
  inviterId: string;
  recipientUserId?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  participantRole: 'buyer' | 'seller' | 'service_provider' | 'business';
};

export function assertValidInvitationRecipient(input: CreateDealInvitationInput): void {
  if (!input.recipientUserId && !input.email && !input.phone) {
    throw new BadRequestException('An invitation recipient is required.');
  }
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    throw new BadRequestException('Use a valid recipient email.');
  }
  if (input.phone && input.phone.trim().length < 6) {
    throw new BadRequestException('Use a valid recipient phone number.');
  }
}

@Injectable()
export class DealInvitationsService {
  public constructor(
    private readonly tenants: TenantService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  public async createInvitation(input: CreateDealInvitationInput) {
    assertValidInvitationRecipient(input);
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) throw new NotFoundException('Deal not found.');
    const participant = await prisma.dealParticipant.findFirst({
      where: { dealId: deal.id, userId: input.inviterId }
    });
    const isDirectParty = deal.buyerId === input.inviterId || deal.sellerId === input.inviterId;
    if (deal.businessId) {
      await this.tenants.requireMembership(input.inviterId, deal.businessId, 'deal:read');
    } else if (!isDirectParty && !participant) {
      throw new ForbiddenException('Only authorized Deal parties may create invitations.');
    }
    const rawToken = randomBytes(32).toString('base64url');
    const invitation = await prisma.$transaction(async (tx) => {
      const created = await tx.dealInvitation.create({
        data: {
          dealId: deal.id,
          inviterId: input.inviterId,
          recipientUserId: input.recipientUserId ?? null,
          email: input.email?.trim().toLowerCase() ?? null,
          phone: input.phone?.trim() ?? null,
          participantRole: input.participantRole,
          tokenHash: createHash('sha256').update(rawToken).digest('hex'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });
      await tx.dealEvent.create({
        data: {
          dealId: deal.id,
          actorId: input.inviterId,
          action: 'deal.invitation.created',
          metadata: { invitationId: created.id, role: input.participantRole }
        }
      });
      return created;
    });
    await this.notifications.createInApp({
      userId: input.recipientUserId ?? input.inviterId,
      businessId: deal.businessId ?? undefined,
      title: 'Transaction invitation received',
      body: `${deal.title} is waiting for review.`,
      metadata: { dealId: deal.id, invitationId: invitation.id }
    });
    await this.audit.record({
      actorId: input.inviterId,
      businessId: deal.businessId ?? undefined,
      action: 'deal_invitation_created',
      resource: `DealInvitation:${invitation.id}`
    });
    return {
      id: invitation.id,
      dealId: invitation.dealId,
      status: invitation.status,
      participantRole: invitation.participantRole,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt
    };
  }

  public async getInvitation(rawToken: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await prisma.dealInvitation.findUnique({
      where: { tokenHash },
      include: {
        deal: {
          select: { id: true, title: true, description: true, amount: true, currency: true }
        },
        inviter: { include: { profile: { select: { name: true } } } }
      }
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.expiresAt <= new Date() || invitation.status === 'expired') {
      throw new BadRequestException('Invitation has expired.');
    }
    if (invitation.status === 'accepted' || invitation.status === 'declined') {
      throw new BadRequestException('Invitation is no longer pending.');
    }
    if (!invitation.viewedAt) {
      await prisma.$transaction([
        prisma.dealInvitation.update({
          where: { id: invitation.id },
          data: { viewedAt: new Date() }
        }),
        prisma.dealEvent.create({
          data: {
            dealId: invitation.dealId,
            action: 'deal.invitation.viewed',
            metadata: { invitationId: invitation.id }
          }
        })
      ]);
    }
    return {
      id: invitation.id,
      deal: {
        title: invitation.deal.title,
        description: invitation.deal.description,
        amount: invitation.deal.amount.toString(),
        currency: invitation.deal.currency
      },
      inviter: { displayName: invitation.inviter.profile?.name ?? 'TrustPay member' },
      participantRole: invitation.participantRole,
      expiresAt: invitation.expiresAt,
      status: invitation.status
    };
  }

  public async acceptInvitation(rawToken: string, acceptingUserId: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await prisma.dealInvitation.findUnique({
      where: { tokenHash },
      include: { deal: true }
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.expiresAt <= new Date() || invitation.status === 'expired') {
      throw new BadRequestException('Invitation has expired.');
    }
    if (invitation.status === 'accepted' || invitation.status === 'declined') {
      throw new BadRequestException('Invitation is no longer pending.');
    }
    if (invitation.recipientUserId !== acceptingUserId) {
      throw new ForbiddenException('This invitation is not assigned to your account.');
    }
    const acceptedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.dealParticipant.upsert({
        where: {
          dealId_userId_role: {
            dealId: invitation.dealId,
            userId: acceptingUserId,
            role: invitation.participantRole
          }
        },
        create: {
          dealId: invitation.dealId,
          userId: acceptingUserId,
          role: invitation.participantRole,
          acceptedAt
        },
        update: { acceptedAt }
      });
      await tx.dealTerms.update({
        where: { dealId: invitation.dealId },
        data: { acceptedAt }
      });
      await tx.deal.update({
        where: { id: invitation.dealId },
        data: { status: 'parties_accepted' }
      });
      await tx.dealEvent.create({
        data: {
          dealId: invitation.dealId,
          actorId: acceptingUserId,
          action: 'deal.parties_accepted',
          metadata: { invitationId: invitation.id, role: invitation.participantRole }
        }
      });
      await tx.dealInvitation.update({
        where: { id: invitation.id },
        data: { status: 'accepted', acceptedAt }
      });
      await tx.dealEvent.create({
        data: {
          dealId: invitation.dealId,
          actorId: acceptingUserId,
          action: 'deal.invitation.accepted',
          metadata: { invitationId: invitation.id, role: invitation.participantRole }
        }
      });
    });
    await this.notifications.createInApp({
      userId: invitation.inviterId,
      businessId: invitation.deal.businessId ?? undefined,
      title: 'Invitation accepted',
      body: 'Your protected transaction invitation was accepted.',
      metadata: { dealId: invitation.dealId, invitationId: invitation.id }
    });
    await this.audit.record({
      actorId: acceptingUserId,
      action: 'deal_invitation_accepted',
      resource: `DealInvitation:${invitation.id}`
    });
    return {
      invitationId: invitation.id,
      dealId: invitation.dealId,
      participantRole: invitation.participantRole,
      acceptedAt
    };
  }

  public async rejectInvitation(rawToken: string, rejectingUserId: string) {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const invitation = await prisma.dealInvitation.findUnique({
      where: { tokenHash },
      include: { deal: true }
    });
    if (!invitation) throw new NotFoundException('Invitation not found.');
    if (invitation.expiresAt <= new Date() || invitation.status === 'expired') {
      throw new BadRequestException('Invitation has expired.');
    }
    if (invitation.status === 'accepted' || invitation.status === 'declined') {
      throw new BadRequestException('Invitation is no longer pending.');
    }
    if (invitation.recipientUserId !== rejectingUserId) {
      throw new ForbiddenException('This invitation is not assigned to your account.');
    }
    const declinedAt = new Date();
    await prisma.$transaction([
      prisma.dealInvitation.update({
        where: { id: invitation.id },
        data: { status: 'declined' }
      }),
      prisma.dealEvent.create({
        data: {
          dealId: invitation.dealId,
          actorId: rejectingUserId,
          action: 'deal.invitation.declined',
          metadata: { invitationId: invitation.id }
        }
      })
    ]);
    await this.notifications.createInApp({
      userId: invitation.inviterId,
      businessId: invitation.deal.businessId ?? undefined,
      title: 'Invitation declined',
      body: 'A protected transaction invitation was declined.',
      metadata: { dealId: invitation.dealId, invitationId: invitation.id }
    });
    await this.audit.record({
      actorId: rejectingUserId,
      action: 'deal_invitation_declined',
      resource: `DealInvitation:${invitation.id}`
    });
    return { invitationId: invitation.id, dealId: invitation.dealId, declinedAt };
  }
}
