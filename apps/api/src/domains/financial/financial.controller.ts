import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { createPaymentIntentSchema, createRefundSchema } from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import { Public } from '../auth/public.decorator.js';
import type { PaymentIntentsService } from './payments/payment-intents.service.js';
import type { RefundsService } from './refunds/refunds.service.js';
import type { SettlementsService } from './settlements/settlements.service.js';

@Controller('financial')
export class FinancialController {
  public constructor(
    private readonly payments: PaymentIntentsService,
    private readonly refunds: RefundsService,
    private readonly settlements: SettlementsService
  ) {}

  @Post('payment-intents')
  public createPayment(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.payments.create(request.user!.id, parseRequest(createPaymentIntentSchema, body));
  }

  @Get('payment-intents')
  public listPayments(@Req() request: AuthenticatedRequest) {
    return this.payments.listForUser(request.user!.id);
  }

  @Public()
  @Post('webhooks/:providerCode')
  public webhook(
    @Param('providerCode') providerCode: string,
    @Headers('x-trustpay-signature') signature: string | undefined,
    @Body() body: unknown
  ) {
    return this.payments.processWebhook(providerCode, signature, body);
  }

  @Post('refunds')
  public createRefund(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.refunds.request(request.user!.id, parseRequest(createRefundSchema, body));
  }

  @Post('refunds/:refundId/approve')
  public approveRefund(@Req() request: AuthenticatedRequest, @Param('refundId') refundId: string) {
    return this.refunds.approve(request.user!.id, refundId);
  }

  @Post('refunds/:refundId/complete')
  public completeRefund(@Req() request: AuthenticatedRequest, @Param('refundId') refundId: string) {
    return this.refunds.complete(request.user!.id, refundId);
  }

  @Get('settlements')
  public listSettlements() {
    return this.settlements.list();
  }

  @Post('settlements')
  public createSettlement(
    @Req() request: AuthenticatedRequest,
    @Body() body: { dealId: string; idempotencyKey: string }
  ) {
    return this.settlements.createForCompletedDeal(
      request.user!.id,
      body.dealId,
      body.idempotencyKey
    );
  }

  @Post('settlements/:settlementId/complete')
  public completeSettlement(
    @Req() request: AuthenticatedRequest,
    @Param('settlementId') settlementId: string
  ) {
    return this.settlements.complete(request.user!.id, settlementId);
  }
}
