import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from '@trustpay/database';
import type { CreateProductInput, UpdateProductInput } from '@trustpay/validation';
import type { AuditService } from '../audit/audit.service.js';
import type { TenantService } from '../businesses/tenant.service.js';

@Injectable()
export class ProductsService {
  public constructor(
    private readonly audit: AuditService,
    private readonly tenants: TenantService
  ) {}

  public async list(input: {
    search?: string;
    categoryId?: string;
    location?: string;
    verified?: boolean;
  }) {
    const products = await prisma.product.findMany({
      where: {
        status: 'published',
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(input.location ? { location: { contains: input.location, mode: 'insensitive' } } : {}),
        ...(input.search
          ? {
              OR: [
                { title: { contains: input.search, mode: 'insensitive' } },
                { description: { contains: input.search, mode: 'insensitive' } }
              ]
            }
          : {}),
        ...(input.verified
          ? {
              seller: {
                trustProfile: { is: { isPublic: true, verificationLevel: { not: 'level_0' } } }
              }
            }
          : {})
      },
      include: {
        seller: { include: { profile: true, trustProfile: true } },
        business: true,
        category: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    return products.map((product) => this.publicProduct(product));
  }

  public async get(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        seller: { include: { profile: true, trustProfile: true } },
        business: true,
        category: true
      }
    });
    if (!product || product.status !== 'published')
      throw new NotFoundException('Product not found.');
    return this.publicProduct(product);
  }

  public async listForSeller(actorId: string) {
    return prisma.product.findMany({
      where: { sellerId: actorId },
      include: { category: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  public async create(actorId: string, input: CreateProductInput) {
    if (input.businessId)
      await this.tenants.requireMembership(actorId, input.businessId, 'business:manage');
    const product = await prisma.product.create({
      data: {
        sellerId: actorId,
        businessId: input.businessId ?? null,
        categoryId: input.categoryId ?? null,
        title: input.title,
        description: input.description,
        images: input.images ? (input.images as Prisma.InputJsonValue) : Prisma.JsonNull,
        price: input.price,
        currency: input.currency,
        location: input.location ?? null,
        status: input.status ?? 'draft'
      }
    });
    await this.audit.record({
      actorId,
      businessId: input.businessId,
      action: 'commerce.product.created',
      resource: `product:${product.id}`
    });
    return product;
  }

  public async update(actorId: string, id: string, input: UpdateProductInput) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Product not found.');
    if (existing.sellerId !== actorId)
      throw new ForbiddenException('Only the seller may edit this listing.');
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.images !== undefined ? { images: input.images as Prisma.InputJsonValue } : {}),
        ...(input.price !== undefined ? { price: input.price } : {}),
        ...(input.currency !== undefined ? { currency: input.currency } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      }
    });
    await this.audit.record({
      actorId,
      businessId: product.businessId ?? undefined,
      action: 'commerce.product.updated',
      resource: `product:${id}`
    });
    return product;
  }

  public async remove(actorId: string, id: string) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Product not found.');
    if (product.sellerId !== actorId)
      throw new ForbiddenException('Only the seller may remove this listing.');
    const removed = await prisma.product.update({ where: { id }, data: { status: 'unavailable' } });
    await this.audit.record({
      actorId,
      businessId: removed.businessId ?? undefined,
      action: 'commerce.product.unpublished',
      resource: `product:${id}`
    });
    return removed;
  }

  private publicProduct(
    product: Prisma.ProductGetPayload<{
      include: {
        seller: { include: { profile: true; trustProfile: true } };
        business: true;
        category: true;
      };
    }>
  ) {
    const trust = product.seller.trustProfile;
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      images: product.images,
      price: product.price.toString(),
      currency: product.currency,
      location: product.location,
      category: product.category,
      seller: {
        id: product.sellerId,
        name: product.business?.name ?? product.seller.profile?.name ?? 'TrustPay seller',
        verificationLevel: trust?.verificationLevel ?? 'level_0',
        trustScore: trust?.score ?? null,
        completedDeals: trust?.completedDeals ?? null,
        averageRating: trust?.averageRating?.toString() ?? null
      }
    };
  }
}
