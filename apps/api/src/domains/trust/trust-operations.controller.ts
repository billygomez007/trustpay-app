import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import {
  createFraudCaseSchema,
  updateFraudCaseSchema,
  verificationDecisionSchema
} from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { TrustOperationsService } from './trust-operations.service.js';
import type { VerificationDocumentsService } from './verification-documents.service.js';

@Controller('admin/trust')
export class TrustOperationsController {
  public constructor(
    private readonly operations: TrustOperationsService,
    private readonly documents: VerificationDocumentsService
  ) {}
  @Get('verifications') list(@Req() request: AuthenticatedRequest) {
    return this.operations.listVerifications(request.user!.id);
  }
  @Post('verifications/:id/approve') approve(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    return this.operations.review(request.user!.id, id, 'verified', body.reason);
  }
  @Post('verifications/:id/reject') reject(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason: string }
  ) {
    return this.operations.review(request.user!.id, id, 'rejected', body.reason);
  }
  @Get('risk-signals') riskSignals(@Req() request: AuthenticatedRequest) {
    return this.operations.listRiskSignals(request.user!.id);
  }
  @Get('fraud-cases') fraud(@Req() request: AuthenticatedRequest) {
    return this.operations.listFraudCases(request.user!.id);
  }
  @Get('disputes') disputes(@Req() request: AuthenticatedRequest) {
    return this.operations.listDisputes(request.user!.id);
  }
  @Get('disputes/:id')
  dispute(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.operations.dispute(request.user!.id, id);
  }
  @Get('business-verifications')
  listBusiness(@Req() request: AuthenticatedRequest) {
    return this.operations.listBusinessVerifications(request.user!.id);
  }
  @Get('business-verifications/:id')
  business(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.operations.businessVerification(request.user!.id, id);
  }
  @Post('business-verifications/:id/approve')
  approveBusiness(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.operations.reviewBusiness(
      request.user!.id,
      id,
      'verified',
      parseRequest(verificationDecisionSchema, body).reason
    );
  }
  @Post('business-verifications/:id/reject')
  rejectBusiness(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.operations.reviewBusiness(
      request.user!.id,
      id,
      'rejected',
      parseRequest(verificationDecisionSchema, body).reason
    );
  }
  @Post('business-verifications/:id/request-information')
  requestBusinessInformation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.operations.reviewBusiness(
      request.user!.id,
      id,
      'more_information_required',
      parseRequest(verificationDecisionSchema, body).reason
    );
  }
  @Get('fraud-cases/:id')
  fraudCase(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.operations.fraudCase(request.user!.id, id);
  }
  @Post('fraud-cases')
  createFraudCase(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.operations.createFraudCase(
      request.user!.id,
      parseRequest(createFraudCaseSchema, body)
    );
  }
  @Patch('fraud-cases/:id')
  updateFraudCase(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.operations.updateFraudCase(
      request.user!.id,
      id,
      parseRequest(updateFraudCaseSchema, body)
    );
  }
  @Get('documents/:id')
  document(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.documents.accessForStaff(request.user!.id, id);
  }
}
