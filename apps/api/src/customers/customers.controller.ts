import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { CustomerService } from './services/customer.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerListQueryDto } from './dto/customer.dto';

@Controller('customers')
export class CustomersController {
  constructor(private customerService: CustomerService) {}

  @Post()
  async create(@Body() dto: CreateCustomerDto, @CurrentAuth() auth: RequestAuthContext) {
    const customer = await this.customerService.create({
      ...dto,
      tenantId: auth.tenantId,
      shop_id: '', // TODO: Get from context or request
      created_by: auth.userId ?? null,
      updated_by: auth.userId ?? null,
    });
    return { data: customer };
  }

  @Get()
  async list(@Query() query: CustomerListQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    const result = await this.customerService.list(
      {
        search: query.search,
        status: query.status,
        customer_type: query.customer_type,
        page: query.page ? parseInt(query.page, 10) : undefined,
        per_page: query.per_page ? parseInt(query.per_page, 10) : undefined,
      },
      auth.tenantId,
    );
    return {
      data: result.data,
      meta: { total: result.total, page: result.page, per_page: result.per_page },
    };
  }

  @Get(':id')
  async get(@Param('id') id: string, @CurrentAuth() auth: RequestAuthContext) {
    const customer = await this.customerService.findById(id, auth.tenantId);
    return { data: customer };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const customer = await this.customerService.update(
      id,
      {
        ...dto,
        updated_by: auth.userId ?? null,
      },
      auth.tenantId,
    );
    return { data: customer };
  }
}
