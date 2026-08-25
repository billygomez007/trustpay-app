import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { hasPermission, type Role } from '@trustpay/auth';
import { prisma } from '@trustpay/database';
import type { AuditService } from '../../audit/audit.service.js';
import type { LedgerService } from '../ledger/ledger.service.js';

@Injectable()
export class SettlementsService {
  public constructor(
    private readonly audit: AuditService,
    private readonly ledger: LedgerService
  ) {}

  public async createForCompletedDeal(actorId: string, dealId: string, idempotencyKey: string) {
    const existingRequest = await prisma.settlement.findUnique({ where: { idempotencyKey } });
    if (existingRequest) return existingRequest;
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException('Deal not found.');
    if (deal.status !== 'completed')
      throw new BadRequestException('Only completed Deals may enter settlement.');
    if (deal.sellerId !== actorId) await this.requireFinanceRole(actorId);
    const existing = await prisma.settlement.findFirst({ where: { dealId } });
    if (existing) return existing;
    const settlement = await prisma.$transaction(async (transaction) =>
      transaction.settlement.create({
        data: {
          reference: `ST-${crypto.randomUUID().slice(0, 12).toUpperCase()}`,
          dealId,
          beneficiaryId: deal.sellerId,
          amount: deal.amount.minus(deal.feeAmount ?? 0),
          currency: deal.currency,
          idempotencyKey,
          initiatedById: actorId
        }
      })
    );
    await this.audit.record({
      actorId,
      businessId: deal.businessId ?? undefined,
      action: 'financial.settlement.payable_created',
      resource: `settlement:${settlement.id}`
    });
    return settlement;
  }

  public async complete(actorId: string, settlementId: string) {
    await this.requireFinanceRole(actorId);
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: { deal: true }
    });
    if (!settlement) throw new NotFoundException('Settlement not found.');
    if (settlement.status === 'completed') return settlement;
    if (settlement.status !== 'created' && settlement.status !== 'processing')
      throw new BadRequestException('Settlement is not ready for completion.');
    const result = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.settlement.update({
        where: { id: settlementId },
        data: { status: 'completed' }
      });
      await this.ledger.postJournal(
        {
          reference: `JE-${settlement.reference}`,
          source: 'settlement.completed',
          description: `Settlement completed for ${settlement.deal.reference}`,
          dealId: settlement.dealId,
          lines: [
            {
              accountCode: `seller-payable-${settlement.currency}`,
              accountName: 'Seller Payable',
              accountType: 'liability',
              direction: 'debit',
              amount: settlement.amount.toFixed(2),
              currency: settlement.currency
            },
            {
              accountCode: `settlement-clearing-${settlement.currency}`,
              accountName: 'Settlement Clearing',
              accountType: 'asset',
              direction: 'credit',
              amount: settlement.amount.toFixed(2),
              currency: settlement.currency
            }
          ]
        },
        transaction
      );
      return updated;
    });
    await this.audit.record({
      actorId,
      businessId: settlement.deal.businessId ?? undefined,
      action: 'financial.settlement.completed',
      resource: `settlement:${settlementId}`
    });
    return result;
  }

  public async list() {
    return prisma.settlement.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  }

  private async requireFinanceRole(userId: string) {
    const assignments = await prisma.staffRoleAssignment.findMany({ where: { userId } });
    if (
      !hasPermission(
        assignments.map((item) => item.role as Role),
        'finance:reconcile'
      )
    )
      throw new ForbiddenException('Finance permission required.');
  }
}
