import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import {
  createDisputeSchema,
  disputeDecisionSchema,
  proposeDisputeResolutionSchema,
  reviewDisputeResolutionSchema,
  submitDisputeEvidenceSchema,
  submitDisputeResponseSchema
} from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { DisputesService } from './disputes.service.js';

@Controller('disputes')
export class DisputesController {
  public constructor(private readonly disputes: DisputesService) {}

  @Get()
  public list(@Req() request: AuthenticatedRequest) {
    return this.disputes.listForParticipant(request.user!.id);
  }

  @Get(':disputeId')
  public get(@Req() request: AuthenticatedRequest, @Param('disputeId') disputeId: string) {
    return this.disputes.getForParticipant(request.user!.id, disputeId);
  }

  @Post()
  public open(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.disputes.open(request.user!.id, parseRequest(createDisputeSchema, body));
  }

  @Post(':disputeId/evidence')
  public evidence(
    @Req() request: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown
  ) {
    return this.disputes.submitEvidence(
      request.user!.id,
      disputeId,
      parseRequest(submitDisputeEvidenceSchema, body)
    );
  }

  @Post(':disputeId/response')
  public response(
    @Req() request: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown
  ) {
    return this.disputes.respond(
      request.user!.id,
      disputeId,
      parseRequest(submitDisputeResponseSchema, body)
    );
  }

  @Post(':disputeId/resolution')
  public resolution(
    @Req() request: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown
  ) {
    return this.disputes.proposeResolution(
      request.user!.id,
      disputeId,
      parseRequest(proposeDisputeResolutionSchema, body)
    );
  }

  @Post(':disputeId/resolution/decision')
  public resolutionDecision(
    @Req() request: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown
  ) {
    return this.disputes.reviewResolution(
      request.user!.id,
      disputeId,
      parseRequest(reviewDisputeResolutionSchema, body)
    );
  }

  @Post(':disputeId/decision')
  public decision(
    @Req() request: AuthenticatedRequest,
    @Param('disputeId') disputeId: string,
    @Body() body: unknown
  ) {
    return this.disputes.decide(
      request.user!.id,
      disputeId,
      parseRequest(disputeDecisionSchema, body)
    );
  }
}
