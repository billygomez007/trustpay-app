import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { prisma, Prisma } from '@trustpay/database';
import { providerWebhookSchema, type CreatePaymentIntentInput } from '@trustpay/validation';
import type { AuditService } from '../../audit/audit.service.js';
import type { NotificationService } from '../../notifications/notification.service.js';
import type { LedgerService } from '../ledger/ledger.service.js';
import type { ProviderRegistryService } from '../providers/provider-registry.service.js';

@Injectable()
export class PaymentIntentsService {
  public constructor(
    private readonly providers: ProviderRegistryService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationService
  ) {}

  public async create(actorId: string, input: CreatePaymentIntentInput) {
    const existing = await prisma.paymentIntent.findUnique({
      where: { idempotencyKey: input.idempotencyKey }
    });
    if (existing) {
      return existing;
    }
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) throw new NotFoundException('Deal not found.');
    if (deal.buyerId !== actorId)
      throw new ForbiddenException('Only the Deal buyer may prepare payment.');
    if (deal.status !== 'awaiting_payment') {
      throw new BadRequestException(
        'A payment intent can only be created for a Deal awaiting payment.'
      );
    }
    const provider = this.providers.get(input.providerCode);
    const reference = `PI-${crypto.randomUUID().slice(0, 12).toUpperCase()}`;
    const request = await provider.createPaymentRequest({
      reference,
      amount: deal.amount.toFixed(2),
      currency: deal.currency,
      idempotencyKey: input.idempotencyKey
    });
    const intent = await prisma.$transaction(async (transaction) => {
      const created = await transaction.paymentIntent.create({
        data: {
          reference,
          dealId: deal.id,
          amount: deal.amount,
          currency: deal.currency,
          providerCode: provider.code,
          providerReference: request.providerReference,
          status: request.status,
          idempotencyKey: input.idempotencyKey,
          metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull
        }
      });
      await transaction.financialEvent.create({
        data: {
          reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          paymentIntentId: created.id,
          eventType: 'payment.pending',
          source: `provider:${provider.code}`,
          metadata: { dealId: deal.id }
        }
      });
      return created;
    });
    await this.audit.record({
      actorId,
      businessId: deal.businessId ?? undefined,
      action: 'financial.payment_intent.created',
      resource: `payment-intent:${intent.id}`
    });
    return intent;
  }

  public async processWebhook(providerCode: string, signature: string | undefined, rawPayload: unknown) {
    const provider = this.providers.get(providerCode);
    const normalized = await provider.normalizeWebhookEvent(rawPayload);
    const input = providerWebhookSchema.parse(normalized);
    if (!(await provider.verifyWebhook({ signature, payload: rawPayload }))) {
      throw new ForbiddenException('Webhook signature verification failed.');
    }
    const verification = await provider.verifyTransaction({ reference: input.providerReference });
    if (!verification.success || verification.amount !== input.amount || verification.currency !== input.currency) {
      throw new BadRequestException('Provider transaction verification does not match the Payment Intent.');
    }
    const result = await prisma.$transaction(async (transaction) => {
      const prior = await transaction.webhookEvent.findUnique({
        where: {
          providerCode_providerEventId: { providerCode, providerEventId: input.providerEventId }
        }
      });
      if (prior) return { accepted: true, duplicate: true, intent: null };
      await transaction.webhookEvent.create({
        data: {
          providerCode,
          providerEventId: input.providerEventId,
          signatureVerified: true,
          payload: rawPayload as Prisma.InputJsonValue
        }
      });
      const intent = await transaction.paymentIntent.findFirst({
        where: { providerCode, providerReference: input.providerReference },
        include: { deal: true }
      });
      if (!intent) throw new NotFoundException('Payment intent not found.');
      if (input.amount !== intent.amount.toFixed(2) || input.currency !== intent.currency) {
        throw new BadRequestException('Provider payment amount or currency does not match the Payment Intent.');
      }

      if (input.eventType === 'payment.failed') {
        await transaction.paymentIntent.update({ where: { id: intent.id }, data: { status: 'failed' } });
        await transaction.financialEvent.create({
          data: {
            reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
            paymentIntentId: intent.id,
            eventType: 'payment.failed',
            source: `provider:${providerCode}`,
            providerEventId: input.providerEventId
          }
        });
        await transaction.webhookEvent.update({
          where: {
            providerCode_providerEventId: { providerCode, providerEventId: input.providerEventId }
          },
          data: { processedAt: new Date() }
        });
        return { accepted: true, duplicate: false, intent: null };
      }
      if (intent.status === 'confirmed') {
        await transaction.webhookEvent.update({
          where: {
            providerCode_providerEventId: { providerCode, providerEventId: input.providerEventId }
          },
          data: { processedAt: new Date() }
        });
        return { accepted: true, duplicate: true, intent: null };
      }

      await transaction.paymentIntent.update({
        where: { id: intent.id },
        data: { status: 'confirmed' }
      });
      await transaction.financialEvent.create({
        data: {
          reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          paymentIntentId: intent.id,
          eventType: 'payment.confirmed',
          source: `provider:${providerCode}`,
          providerEventId: input.providerEventId,
          metadata: rawPayload as Prisma.InputJsonValue
        }
      });
      await transaction.deal.update({
        where: { id: intent.dealId },
        data: { status: 'payment_secured' }
      });
      await transaction.dealEvent.create({
        data: {
          dealId: intent.dealId,
          action: 'deal.payment_secured',
          metadata: { paymentIntentId: intent.id }
        }
      });
      await this.ledger.postJournal({
        reference: `JE-${intent.reference}`,
        source: 'payment_provider_confirmation',
        description: `Payment secured for ${intent.deal.reference}`,
        dealId: intent.dealId,
        paymentIntentId: intent.id,
        lines: [
          {
            accountCode: `customer-payment-${intent.currency}`,
            accountName: 'Customer Payment Clearing',
            accountType: 'asset',
            direction: 'debit',
            amount: intent.amount.toFixed(2),
            currency: intent.currency
          },
          {
            accountCode: `protected-transaction-${intent.currency}`,
            accountName: 'Protected Transaction Liability',
            accountType: 'liability',
            direction: 'credit',
            amount: intent.amount.toFixed(2),
            currency: intent.currency
          }
        ]
      }, transaction);
      await transaction.webhookEvent.update({
        where: {
          providerCode_providerEventId: { providerCode, providerEventId: input.providerEventId }
        },
        data: { processedAt: new Date() }
      });
      return { accepted: true, duplicate: false, intent };
    });
    if (!result.intent) return { accepted: result.accepted, duplicate: result.duplicate };
    const intent = result.intent;
    await this.notifications.createInApp({
      userId: intent.deal.sellerId,
      businessId: intent.deal.businessId ?? undefined,
      title: 'Payment secured',
      body: `${intent.deal.title} now has a verified payment confirmation.`,
      metadata: { dealId: intent.dealId, paymentIntentId: intent.id }
    });
    await this.audit.record({
      businessId: intent.deal.businessId ?? undefined,
      action: 'financial.payment.confirmed',
      resource: `payment-intent:${intent.id}`,
      metadata: { providerCode, providerEventId: input.providerEventId }
    });
    return { accepted: true, duplicate: false };
  }

  public async listForUser(actorId: string) {
    return prisma.paymentIntent.findMany({
      where: { deal: { OR: [{ buyerId: actorId }, { sellerId: actorId }] } },
      include: { deal: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}
