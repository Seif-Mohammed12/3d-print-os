import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentAuth, CustomerAccess } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import {
  AcceptPortalQuoteDto,
  CreatePortalQuoteDto,
  PortalQuoteChoicesDto,
} from './dto/portal.dto';
import { PortalService } from './portal.service';

/** Slicing is expensive: cap how often one client can ask for a price. */
const PRICING_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

/**
 * Customer-facing portal API. Open to customer tokens (@CustomerAccess); PortalService
 * additionally requires a portal_customers row, so staff accounts get 403 here.
 */
@Controller('portal')
@CustomerAccess()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /** Materials, qualities and the printer the shop prices portal quotes on. */
  @Get('quote-options')
  async getQuoteOptions(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.portalService.getQuoteOptions(auth) };
  }

  @Get('quotes')
  async listQuotes(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.portalService.listQuotes(auth) };
  }

  @Get('quotes/:id')
  async getQuote(@CurrentAuth() auth: RequestAuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.portalService.findQuote(auth, id) };
  }

  /** Create a quote for an uploaded model and price it with the slicer. */
  @Post('quotes')
  @Throttle(PRICING_THROTTLE)
  async createQuote(@CurrentAuth() auth: RequestAuthContext, @Body() body: CreatePortalQuoteDto) {
    const quote = await this.portalService.createQuote(auth, {
      modelFileId: body.modelFileId,
      materialId: body.materialId,
      quality: body.quality,
      quantity: body.quantity,
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    });
    return { data: quote };
  }

  /** Change material, quality or quantity and get the new price. */
  @Post('quotes/:id/price')
  @Throttle(PRICING_THROTTLE)
  async repriceQuote(
    @CurrentAuth() auth: RequestAuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PortalQuoteChoicesDto,
  ) {
    const quote = await this.portalService.repriceQuote(auth, id, {
      materialId: body.materialId,
      quality: body.quality,
      quantity: body.quantity,
    });
    return { data: quote };
  }

  /** Accept the price: creates the order the shop works from. */
  @Post('quotes/:id/accept')
  async acceptQuote(
    @CurrentAuth() auth: RequestAuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AcceptPortalQuoteDto,
  ) {
    const quote = await this.portalService.acceptQuote(
      auth,
      id,
      body.expectedTotalCents,
      body.notes,
    );
    return { data: quote };
  }

  @Get('orders')
  async listOrders(@CurrentAuth() auth: RequestAuthContext) {
    return { data: await this.portalService.listOrders(auth) };
  }
}
