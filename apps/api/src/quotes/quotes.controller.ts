import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import {
  ApproveQuoteDto,
  CreateQuoteDto,
  QuoteListQueryDto,
  RejectQuoteDto,
  UpdateQuoteDto,
} from './dto/quote.dto';
import { QuoteService } from './services/quote.service';

@Controller('quotes')
export class QuotesController {
  constructor(private quoteService: QuoteService) {}

  @Post()
  async create(@Body() dto: CreateQuoteDto, @CurrentAuth() auth: RequestAuthContext) {
    const quote = await this.quoteService.create({
      tenantId: auth.tenantId,
      shop_id: dto.shopId,
      customer_id: dto.customerId,
      model_id: dto.modelId,
    });
    return { data: quote };
  }

  @Post(':id/analyze')
  async analyze(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const quote = await this.quoteService.analyzeQuote(id, auth.tenantId);
    return { data: quote };
  }

  @Get()
  async list(@Query() query: QuoteListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    return this.quoteService.list(
      {
        customerId: query.customerId,
        shopId: query.shopId,
        status: query.status,
        page: query.page,
        perPage: query.perPage,
      },
      auth.tenantId,
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const quote = await this.quoteService.findById(id, auth.tenantId);
    return { data: quote };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const quote = await this.quoteService.update(id, dto, auth.tenantId, auth.userId);
    return { data: quote };
  }

  @Post(':id/approve')
  async approve(
    @Param('id') id: string,
    @Body() dto: ApproveQuoteDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const quote = await this.quoteService.approve(id, auth.tenantId, auth.userId, dto.notes);
    return { data: quote };
  }

  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() dto: RejectQuoteDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const quote = await this.quoteService.reject(id, auth.tenantId, auth.userId, dto.reason);
    return { data: quote };
  }

  @Post(':id/complete')
  async complete(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const quote = await this.quoteService.complete(id, auth.tenantId, auth.userId);
    return { data: quote };
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    await this.quoteService.delete(id, auth.tenantId);
    return { success: true };
  }
}
