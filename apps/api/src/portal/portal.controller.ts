import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { PortalService } from './portal.service';
import { CreateQuoteRequestDto } from './dto/portal.dto';

@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  @Get('quotes')
  async getCustomerQuotes(@CurrentAuth() auth: RequestAuthContext) {
    return this.portalService.getCustomerQuotes(auth.userId, auth.tenantId);
  }

  @Post('quotes')
  async createQuoteRequest(
    @Body() body: CreateQuoteRequestDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    return this.portalService.createQuoteRequest(auth.userId, auth.tenantId, body);
  }

  @Get('orders')
  async getCustomerOrders(@CurrentAuth() auth: RequestAuthContext) {
    return this.portalService.getCustomerOrders(auth.userId, auth.tenantId);
  }
}
