import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import type { CreateOrderInput } from '@trustpay/validation';
import type { AuditService } from '../audit/audit.service.js';
import type { PaymentIntentsService } from '../financial/payments/payment-intents.service.js';

@Injectable()
export class OrdersService {
  public constructor(
    private readonly audit: AuditService,
    private readonly payments: PaymentIntentsService
  ) {}

  public async create(buyerId: string, input: CreateOrderInput) {
    const product = await prisma.product.findUnique({ where: { id: input.productId } });
    if (!product || product.status !== 'published')
      throw new NotFoundException('Product not found.');
    if (product.sellerId === buyerId)
      throw new ForbiddenException('A seller cannot purchase their own listing.');
    const now = new Date();
    const order = await prisma.$transaction(async (transaction) => {
      const deal = await transaction.deal.create({
        data: {
          reference: `DL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          businessId: product.businessId,
          buyerId,
          sellerId: product.sellerId,
          type: 'custom',
          title: product.title,
          description: product.description,
          amount: product.price,
          currency: product.currency,
          inspectionPeriodHours: input.inspectionPeriodHours ?? null
        }
      });
      await transaction.dealParticipant.createMany({
        data: [
          { dealId: deal.id, userId: buyerId, role: 'buyer', acceptedAt: now },
          { dealId: deal.id, userId: product.sellerId, role: 'seller' }
        ]
      });
      await transaction.dealTerms.create({ data: { dealId: deal.id } });
      await transaction.dealEvent.create({
        data: {
          dealId: deal.id,
          actorId: buyerId,
          action: 'deal.created',
          metadata: { status: deal.status, productId: product.id }
        }
      });
      return transaction.order.create({
        data: {
          buyerId,
          sellerId: product.sellerId,
          productId: product.id,
          dealId: deal.id,
          amount: product.price,
          currency: product.currency,
          status: 'created'
        },
        include: { product: true, deal: true }
      });
    });
    await this.audit.record({
      actorId: buyerId,
      businessId: product.businessId ?? undefined,
      action: 'commerce.order.created',
      resource: `order:${order.id}`,
      metadata: { productId: product.id, dealId: order.dealId }
    });
    return order;
  }

  public async list(actorId: string) {
    return prisma.order.findMany({
      where: { OR: [{ buyerId: actorId }, { sellerId: actorId }] },
      include: { product: true, deal: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async get(actorId: string, id: string) {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { product: true, deal: { include: { events: { orderBy: { createdAt: 'asc' } } } } }
    });
    if (!order || (order.buyerId !== actorId && order.sellerId !== actorId))
      throw new NotFoundException('Order not found.');
    return order;
  }

  public async preparePayment(
    actorId: string,
    orderId: string,
    input: {
      providerCode: string;
      idempotencyKey: string;
      metadata?: Record<string, unknown> | undefined;
    }
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== actorId) throw new NotFoundException('Order not found.');
    if (order.dealId) {
      await prisma.$transaction(async (transaction) => {
        const updated = await transaction.deal.updateMany({
          where: { id: order.dealId, status: 'created' },
          data: { status: 'awaiting_payment' }
        });
        if (updated.count > 0)
          await transaction.dealEvent.create({
            data: {
              dealId: order.dealId,
              actorId,
              action: 'deal.awaiting_payment',
              metadata: { orderId }
            }
          });
      });
    }
    return this.payments.create(actorId, {
      dealId: order.dealId,
      providerCode: input.providerCode,
      idempotencyKey: input.idempotencyKey,
      ...(input.metadata ? { metadata: input.metadata } : {})
    });
  }
}
