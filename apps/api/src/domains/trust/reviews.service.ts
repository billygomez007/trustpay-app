import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { prisma } from '@trustpay/database';
import { TrustService } from './trust.service.js';

@Injectable()
export class ReviewsService {
  public constructor(@Inject(TrustService) private readonly trust: TrustService) {}

  public async create(input: {
    actorId: string;
    dealId: string;
    rating: number;
    comment?: string | undefined;
  }) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
      throw new BadRequestException('Rating must be between 1 and 5.');
    const deal = await prisma.deal.findUnique({ where: { id: input.dealId } });
    if (!deal) throw new NotFoundException('Deal not found.');
    if (deal.status !== 'completed')
      throw new BadRequestException('Only completed Deals can be reviewed.');
    if (input.actorId !== deal.buyerId && input.actorId !== deal.sellerId)
      throw new ForbiddenException('Only Deal participants can review.');
    const review = await prisma.review.create({
      data: {
        dealId: deal.id,
        reviewerId: input.actorId,
        revieweeId: input.actorId === deal.buyerId ? deal.sellerId : deal.buyerId,
        businessId: deal.businessId,
        rating: input.rating,
        comment: input.comment ?? null
      }
    });
    await this.trust.refreshProfileForUser(review.revieweeId);
    await this.trust.refreshProfileForUser(review.reviewerId);
    if (deal.businessId) {
      await this.trust.refreshProfileForBusiness(deal.businessId);
    }
    return review;
  }
}
