import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@trustpay/database';
import { prisma } from '@trustpay/database';
import { hasPermission, type Role } from '@trustpay/auth';
import type { CreateRefundInput } from '@trustpay/validation';
import type { AuditService } from '../../audit/audit.service.js';
import type { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class RefundsService {
  public constructor(
    private readonly audit: AuditService,
    private readonly ledger: LedgerService
  ) {}

  public async request(actorId: string, input: CreateRefundInput) {
    const existingRequest = await prisma.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existingRequest) return existingRequest;
    const payment = await prisma.paymentIntent.findUnique({
      where: { id: input.paymentIntentId },
      include: { deal: true }
    });
    if (!payment) throw new NotFoundException('Payment intent not found.');
    if (payment.deal.buyerId !== actorId)
      throw new BadRequestException('Only the Deal buyer may request a refund.');
    if (payment.status !== 'confirmed')
      throw new BadRequestException('Only confirmed payments may be refunded.');
    const requestedMinor = toMinor(input.amount);
    const paymentMinor = toMinor(payment.amount.toFixed(2));
    const previous = await prisma.refund.findMany({
      where: { paymentIntentId: payment.id, status: { not: 'failed' } },
      select: { amount: true }
    });
    const previousMinor = previous.reduce((sum, refund) => sum + toMinor(refund.amount.toFixed(2)), 0n);
    if (requestedMinor <= 0n || previousMinor + requestedMinor > paymentMinor)
      throw new BadRequestException('Refund cannot exceed payment amount.');
    const refund = await prisma.$transaction(async (transaction) => {
      const created = await transaction.refund.create({
        data: {
          reference: `RF-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          paymentIntentId: payment.id,
          amount: input.amount,
          currency: payment.currency,
          reason: input.reason ?? null,
          idempotencyKey: input.idempotencyKey,
          requestedById: actorId
        }
      });
      await transaction.financialEvent.create({
        data: {
          reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          paymentIntentId: payment.id,
          eventType: 'refund.requested',
          source: 'trustpay.refunds',
          metadata: { refundId: created.id } as Prisma.InputJsonValue
        }
      });
      return created;
    });
    await this.audit.record({
      actorId,
      businessId: payment.deal.businessId ?? undefined,
      action: 'financial.refund.requested',
      resource: `refund:${refund.id}`
    });
    return refund;
  }

  public async approve(actorId: string, refundId: string) {
    await this.requireFinanceRole(actorId);
    const refund = await prisma.refund.findUnique({ where: { id: refundId }, include: { paymentIntent: { include: { deal: true } } } });
    if (!refund) throw new NotFoundException('Refund not found.');
    if (refund.status !== 'requested') throw new BadRequestException('Refund is not awaiting approval.');
    const updated = await prisma.$transaction(async (transaction) => {
      const result = await transaction.refund.update({ where: { id: refundId }, data: { status: 'approved' } });
      await transaction.financialEvent.create({ data: { reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`, paymentIntentId: refund.paymentIntentId, eventType: 'refund.approved', source: 'trustpay.refunds', metadata: { refundId } as Prisma.InputJsonValue } });
      return result;
    });
    await this.audit.record({ actorId, businessId: refund.paymentIntent.deal.businessId ?? undefined, action: 'financial.refund.approved', resource: `refund:${refundId}` });
    return updated;
  }

  public async complete(actorId: string, refundId: string) {
    await this.requireFinanceRole(actorId);
    const refund = await prisma.refund.findUnique({ where: { id: refundId }, include: { paymentIntent: { include: { deal: true } } } });
    if (!refund) throw new NotFoundException('Refund not found.');
    if (!['approved', 'processing'].includes(refund.status)) throw new BadRequestException('Refund is not ready for completion.');
    const completed = await prisma.$transaction(async (transaction) => {
      const result = await transaction.refund.update({ where: { id: refundId }, data: { status: 'completed' } });
      await transaction.paymentIntent.update({ where: { id: refund.paymentIntentId }, data: { status: 'refunded' } });
      await transaction.financialEvent.create({ data: { reference: `FE-${crypto.randomUUID().slice(0, 12).toUpperCase()}`, paymentIntentId: refund.paymentIntentId, eventType: 'refund.completed', source: 'trustpay.refunds', metadata: { refundId } as Prisma.InputJsonValue } });
      await this.ledger.postJournal({ reference: `JE-${refund.reference}`, source: 'refund.completed', description: `Refund completed for ${refund.paymentIntent.deal.reference}`, dealId: refund.paymentIntent.dealId, paymentIntentId: refund.paymentIntentId, lines: [{ accountCode: `protected-transaction-${refund.currency}`, accountName: 'Protected Transaction Liability', accountType: 'liability', direction: 'debit', amount: refund.amount.toFixed(2), currency: refund.currency }, { accountCode: `customer-payment-${refund.currency}`, accountName: 'Customer Payment Clearing', accountType: 'asset', direction: 'credit', amount: refund.amount.toFixed(2), currency: refund.currency }] }, transaction);
      return result;
    });
    await this.audit.record({ actorId, businessId: refund.paymentIntent.deal.businessId ?? undefined, action: 'financial.refund.completed', resource: `refund:${refundId}` });
    return completed;
  }

  private async requireFinanceRole(userId: string) {
    const assignments = await prisma.staffRoleAssignment.findMany({ where: { userId } });
    if (!hasPermission(assignments.map((item) => item.role as Role), 'finance:reconcile')) throw new ForbiddenException('Finance permission required.');
  }
}

function toMinor(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(`${whole}${fraction.padEnd(2, '0').slice(0, 2)}`);
}
