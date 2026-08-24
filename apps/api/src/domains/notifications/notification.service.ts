import { Injectable } from '@nestjs/common';
import { prisma, Prisma } from '@trustpay/database';

@Injectable()
export class NotificationService {
  public async createInApp(input: {
    userId: string;
    businessId?: string | undefined;
    title: string;
    body: string;
    metadata?: Prisma.InputJsonValue;
  }): Promise<void> {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        businessId: input.businessId ?? null,
        title: input.title,
        body: input.body,
        metadata: input.metadata ?? Prisma.JsonNull,
        channel: 'in_app'
      }
    });
  }

  public async listForUser(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }
}
