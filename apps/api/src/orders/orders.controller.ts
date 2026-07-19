import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import {
  CreateOrderFromQuoteDto,
  CreateOrderHistoryDto,
  CreateOrderItemDto,
  OrderListQueryDto,
  UpdateOrderDto,
  UpdateOrderItemDto,
} from './dto/order.dto';
import { OrderService } from './services/order.service';

@Controller('orders')
export class OrdersController {
  constructor(private orderService: OrderService) {}

  @Post('from-quote')
  async createFromQuote(
    @Body() dto: CreateOrderFromQuoteDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    // This would typically fetch the quote to get pricing details
    // For now, we'll need to pass the required fields
    const order = await this.orderService.createFromQuote({
      tenantId: auth.tenantId,
      shop_id: (dto.shippingAddress?.['shopId'] as string) ?? '',
      customer_id: dto.customerId,
      quote_id: dto.quoteId,
      status: 'pending',
      subtotal_cents: 0,
      tax_cents: 0,
      total_cents: 0,
      currency: 'USD',
      payment_status: 'pending',
      paid_amount_cents: 0,
      payment_method: null,
      payment_reference: null,
      paid_at: null,
      production_status: 'not_started',
      printer_id: null,
      started_at: null,
      completed_at: null,
      quality_check_status: null,
      quality_check_notes: null,
      quality_check_at: null,
      delivery_status: 'not_shipped',
      shipping_address: dto.shippingAddress ?? {},
      tracking_number: null,
      shipped_at: null,
      delivered_at: null,
      internal_notes: null,
      customer_notes: dto.customerNotes ?? null,
      cancellation_reason: null,
      created_by: auth.userId ?? null,
      updated_by: auth.userId ?? null,
    });
    return { data: order };
  }

  @Get()
  async list(@Query() query: OrderListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    const result = await this.orderService.list(
      {
        shopId: query.shopId,
        customerId: query.customerId,
        status: query.status,
        paymentStatus: query.paymentStatus,
        productionStatus: query.productionStatus,
        deliveryStatus: query.deliveryStatus,
        search: query.search,
        page: query.page,
        perPage: query.per_page,
      },
      auth.tenantId,
    );
    return {
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        per_page: result.perPage,
        total_pages: Math.ceil(result.total / result.perPage),
      },
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const order = await this.orderService.findById(id, auth.tenantId);
    return { data: order };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const order = await this.orderService.update(
      id,
      {
        status: dto.status,
        payment_status: dto.paymentStatus,
        paid_amount_cents: dto.paidAmountCents,
        payment_method: dto.paymentMethod,
        payment_reference: dto.paymentReference,
        production_status: dto.productionStatus,
        printer_id: dto.printerId,
        quality_check_status: dto.qualityCheckStatus,
        quality_check_notes: dto.qualityCheckNotes,
        delivery_status: dto.deliveryStatus,
        shipping_address: dto.shippingAddress,
        tracking_number: dto.trackingNumber,
        internal_notes: dto.internalNotes,
        cancellation_reason: dto.cancellationReason,
        updated_by: auth.userId,
      },
      auth.tenantId,
    );
    return { data: order };
  }

  // History endpoints
  @Post(':orderId/history')
  async createHistory(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderHistoryDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const history = await this.orderService.createHistory(
      orderId,
      {
        old_status: dto.oldStatus ?? null,
        new_status: dto.newStatus,
        status_type: dto.statusType,
        changed_by: auth.userId ?? null,
        notes: dto.notes ?? null,
      },
      auth.tenantId,
    );
    return { data: history };
  }

  @Get(':orderId/history')
  async getHistory(@Param('orderId') orderId: string, @CurrentAuth() auth: RequestAuthContext) {
    const history = await this.orderService.getHistoryByOrder(orderId, auth.tenantId);
    return { data: history };
  }

  // Order items endpoints
  @Post(':orderId/items')
  async createItem(
    @Param('orderId') orderId: string,
    @Body() dto: CreateOrderItemDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const item = await this.orderService.createItem(
      orderId,
      {
        item_name: dto.itemName,
        quantity: dto.quantity ?? 1,
        unit_price_cents: dto.unitPriceCents,
        production_status: 'not_started',
        printer_id: dto.printerId ?? null,
      },
      auth.tenantId,
    );
    return { data: item };
  }

  @Get(':orderId/items')
  async getItems(@Param('orderId') orderId: string, @CurrentAuth() auth: RequestAuthContext) {
    const items = await this.orderService.getItemsByOrder(orderId, auth.tenantId);
    return { data: items };
  }

  @Patch('items/:itemId')
  async updateItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const item = await this.orderService.updateItem(
      itemId,
      {
        item_name: dto.itemName,
        quantity: dto.quantity,
        unit_price_cents: dto.unitPriceCents,
        production_status: dto.productionStatus,
        printer_id: dto.printerId ?? null,
      },
      auth.tenantId,
    );
    return { data: item };
  }
}
