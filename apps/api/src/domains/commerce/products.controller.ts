import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { createProductSchema, updateProductSchema } from '@trustpay/validation';
import type { AuthenticatedRequest } from '../../common/authenticated-request.js';
import { parseRequest } from '../../common/parse-request.js';
import { Public } from '../auth/public.decorator.js';
import type { ProductsService } from './products.service.js';

@Controller('products')
export class ProductsController {
  public constructor(private readonly products: ProductsService) {}

  @Public()
  @Get()
  public list(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('location') location?: string,
    @Query('verified') verified?: string
  ) {
    return this.products.list({
      ...(search ? { search } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(location ? { location } : {}),
      ...(verified === 'true' ? { verified: true } : {})
    });
  }

  @Public()
  @Get(':id')
  public get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Get('seller/mine')
  public mine(@Req() request: AuthenticatedRequest) {
    return this.products.listForSeller(request.user!.id);
  }

  @Post()
  public create(@Req() request: AuthenticatedRequest, @Body() body: unknown) {
    return this.products.create(request.user!.id, parseRequest(createProductSchema, body));
  }

  @Patch(':id')
  public update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: unknown
  ) {
    return this.products.update(request.user!.id, id, parseRequest(updateProductSchema, body));
  }

  @Delete(':id')
  public remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.products.remove(request.user!.id, id);
  }
}
