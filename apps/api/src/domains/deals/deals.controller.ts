import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import {
  createDealInvitationSchema,
  createDealAmendmentSchema,
  createDealSchema,
  reviewDealAmendmentSchema,
  transitionDealSchema
} from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { DealsService } from './deals.service.js';
import type { DealInvitationsService } from './deal-invitations.service.js';

@Controller('deals')
export class DealsController {
  public constructor(
    private readonly dealsService: DealsService,
    private readonly invitations: DealInvitationsService
  ) {}

  @Post()
  public create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.dealsService.create(request.user!.id, parseRequest(createDealSchema, body));
  }

  @Post(':dealId/invitations')
  public createInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('dealId') dealId: string,
    @Body() body: unknown
  ) {
    return this.invitations.createInvitation({
      dealId,
      inviterId: request.user!.id,
      ...parseRequest(createDealInvitationSchema, body)
    });
  }

  @Get()
  public list(@Req() request: AuthenticatedRequest, @Query('businessId') businessId?: string) {
    return this.dealsService.list(request.user!.id, businessId);
  }

  @Post(':dealId/transitions')
  public transition(
    @Req() request: AuthenticatedRequest,
    @Param('dealId') dealId: string,
    @Body() body: unknown
  ) {
    return this.dealsService.transition(
      request.user!.id,
      dealId,
      parseRequest(transitionDealSchema, body)
    );
  }

  @Post(':dealId/amendments')
  public proposeAmendment(
    @Req() request: AuthenticatedRequest,
    @Param('dealId') dealId: string,
    @Body() body: unknown
  ) {
    return this.dealsService.proposeAmendment(
      request.user!.id,
      dealId,
      parseRequest(createDealAmendmentSchema, body)
    );
  }

  @Post(':dealId/amendments/:amendmentId/review')
  public reviewAmendment(
    @Req() request: AuthenticatedRequest,
    @Param('dealId') dealId: string,
    @Param('amendmentId') amendmentId: string,
    @Body() body: unknown
  ) {
    return this.dealsService.reviewAmendment(
      request.user!.id,
      dealId,
      amendmentId,
      parseRequest(reviewDealAmendmentSchema, body)
    );
  }

  @Get(':dealId')
  public get(@Req() request: AuthenticatedRequest, @Param('dealId') dealId: string) {
    return this.dealsService.get(request.user!.id, dealId);
  }

  @Get(':dealId/events')
  public events(@Req() request: AuthenticatedRequest, @Param('dealId') dealId: string) {
    return this.dealsService.events(request.user!.id, dealId);
  }
}
