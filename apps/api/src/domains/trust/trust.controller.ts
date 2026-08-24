import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import {
  createReviewSchema,
  createVerificationDocumentSchema,
  submitBusinessVerificationSchema,
  submitIdentityVerificationSchema
} from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import { Public } from '../auth/public.decorator.js';
import type { ReviewsService } from './reviews.service.js';
import type { TrustService } from './trust.service.js';
import type { VerificationDocumentsService } from './verification-documents.service.js';

@Controller('trust')
export class TrustController {
  public constructor(
    private readonly trust: TrustService,
    private readonly reviews: ReviewsService,
    private readonly documents: VerificationDocumentsService
  ) {}
  @Post('identity/submit') submitIdentity(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown
  ) {
    return this.trust.submitIdentity(
      request.user!.id,
      parseRequest(submitIdentityVerificationSchema, body)
    );
  }
  @Get('identity/status') identityStatus(@Req() request: AuthenticatedRequest) {
    return this.trust.myProfile(request.user!.id);
  }
  @Post('business/submit') submitBusiness(
    @Req() request: AuthenticatedRequest,
    @Body() body: unknown
  ) {
    return this.trust.submitBusiness(
      request.user!.id,
      parseRequest(submitBusinessVerificationSchema, body)
    );
  }
  @Get('my-profile') myProfile(@Req() request: AuthenticatedRequest) {
    return this.trust.myProfile(request.user!.id);
  }
  @Get('profile/:id') profile(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.trust.profile(id, request.user!.id);
  }
  @Public()
  @Get('public/:id')
  publicProfile(@Param('id') id: string) {
    return this.trust.publicProfile(id);
  }
  @Public()
  @Get('public-sellers')
  publicProfiles(@Query('search') search?: string) {
    return this.trust.publicProfiles(search);
  }
  @Get('score') score(@Req() request: AuthenticatedRequest) {
    return this.trust.myProfile(request.user!.id);
  }
  @Get('score/history') history(@Req() request: AuthenticatedRequest) {
    return this.trust.myProfile(request.user!.id);
  }
  @Post('reviews') review(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.reviews.create({
      actorId: request.user!.id,
      ...parseRequest(createReviewSchema, body)
    });
  }
  @Get('reviews') reviewsForMe(@Req() request: AuthenticatedRequest) {
    return prisma.review.findMany({
      where: { revieweeId: request.user!.id },
      orderBy: { createdAt: 'desc' }
    });
  }
  @Post('documents')
  registerDocument(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.documents.registerForUser(
      request.user!.id,
      parseRequest(createVerificationDocumentSchema, body)
    );
  }
}
