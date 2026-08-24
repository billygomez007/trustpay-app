import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@trustpay/database';
import { hasPermission, type Role } from '@trustpay/auth';
import type { Permission } from '@trustpay/auth';

export function assertTenantOwnsResource(
  resourceBusinessId: string | null,
  tenantBusinessId: string
): void {
  if (resourceBusinessId !== tenantBusinessId) {
    throw new NotFoundException('Business resource not found.');
  }
}

@Injectable()
export class TenantService {
  public async requireMembership(userId: string, businessId: string, permission?: Permission) {
    const membership = await prisma.businessMember.findUnique({
      where: { businessId_userId: { businessId, userId } },
      include: { business: true }
    });
    if (!membership) {
      throw new NotFoundException('Business not found.');
    }

    if (permission && !hasPermission([membership.role as Role], permission)) {
      throw new ForbiddenException('You do not have permission for this business resource.');
    }
    return membership;
  }
}
