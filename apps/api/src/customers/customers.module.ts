import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { CustomerRepository } from './repositories/customer.repository';
import { CustomersController } from './customers.controller';
import { CustomerService } from './services/customer.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [CustomersController],
  providers: [
    {
      provide: 'CUSTOMER_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new CustomerRepository(pool),
    },
    {
      provide: CustomerService,
      inject: ['CUSTOMER_REPOSITORY'],
      useFactory: (repo: CustomerRepository) => new CustomerService(repo),
    },
  ],
  exports: [CustomerService],
})
export class CustomersModule {}
