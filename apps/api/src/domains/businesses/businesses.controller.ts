import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import { addBusinessMemberSchema, createBusinessSchema } from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import type { AuditService } from '../audit/audit.service.js';
import type { TenantService } from './tenant.service.js';

@Controller('businesses')
export class BusinessesController {
  public constructor(
    private readonly tenantService: TenantService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  public async list(@Req() request: AuthenticatedRequest) {
    return prisma.businessMember.findMany({
      where: { userId: request.user!.id },
      include: { business: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post()
  public async create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    const input = parseRequest(createBusinessSchema, body);
    const business = await prisma.business.create({
      data: {
        name: input.name,
        type: input.type,
        country: input.country,
        currency: input.currency,
        description: input.description ?? null,
        members: { create: { userId: request.user!.id, role: 'business_owner' } }
      }
    });
    await this.auditService.record({
      actorId: request.user!.id,
      businessId: business.id,
      action: 'business.created',
      resource: `business:${business.id}`
    });
    return business;
  }

  @Get(':businessId')
  public async get(@Req() request: AuthenticatedRequest, @Param('businessId') businessId: string) {
    return this.tenantService.requireMembership(request.user!.id, businessId);
  }

  @Get(':businessId/members')
  public async listMembers(
    @Req() request: AuthenticatedRequest,
    @Param('businessId') businessId: string
  ) {
    await this.tenantService.requireMembership(request.user!.id, businessId, 'business:manage');
    return prisma.businessMember.findMany({
      where: { businessId },
      include: { user: { include: { profile: true } } },
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post(':businessId/members')
  public async addMember(
    @Req() request: AuthenticatedRequest,
    @Param('businessId') businessId: string,
    @Body() body: unknown
  ) {
    await this.tenantService.requireMembership(request.user!.id, businessId, 'business:manage');
    const input = parseRequest(addBusinessMemberSchema, body);
    const member = await prisma.businessMember.upsert({
      where: { businessId_userId: { businessId, userId: input.userId } },
      create: { businessId, userId: input.userId, role: input.role },
      update: { role: input.role }
    });
    await this.auditService.record({
      actorId: request.user!.id,
      businessId,
      action: 'business.member_upserted',
      resource: `business-member:${member.id}`,
      metadata: { role: input.role }
    });
    return member;
  }
}
