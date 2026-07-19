import { Module } from '@nestjs/common';
import type { Pool } from 'pg';

import { OrderRepository } from './repositories/order.repository';
import { OrdersController } from './orders.controller';
import { OrderService } from './services/order.service';
import { DATABASE_POOL } from '../config/tokens';

@Module({
  controllers: [OrdersController],
  providers: [
    {
      provide: 'ORDER_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new OrderRepository(pool),
    },
    {
      provide: OrderService,
      inject: ['ORDER_REPOSITORY'],
      useFactory: (repo: OrderRepository) => new OrderService(repo),
    },
    {
      provide: 'ORDER_SERVICE',
      useExisting: OrderService,
    },
  ],
  exports: [OrderService, 'ORDER_SERVICE'],
})
export class OrdersModule {}
