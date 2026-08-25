import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { createOrderSchema, prepareOrderPaymentSchema } from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  public constructor(private readonly orders: OrdersService) {}

  @Post()
  public create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.orders.create(request.user!.id, parseRequest(createOrderSchema, body));
  }

  @Get()
  public list(@Req() request: AuthenticatedRequest) {
    return this.orders.list(request.user!.id);
  }

  @Get(':id')
  public get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.orders.get(request.user!.id, id);
  }

  @Post(':id/payment-intents')
  public preparePayment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.orders.preparePayment(
      request.user!.id,
      id,
      parseRequest(prepareOrderPaymentSchema, body)
    );
  }
}
