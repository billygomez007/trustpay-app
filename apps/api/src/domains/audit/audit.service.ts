import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@trustpay/database';

@Injectable()
export class AuditService {
  public async record(input: {
    actorId?: string | undefined;
    businessId?: string | undefined;
    action: string;
    resource: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        businessId: input.businessId ?? null,
        action: input.action,
        resource: input.resource,
        metadata: input.metadata ?? Prisma.JsonNull
      }
    });
  }
}
