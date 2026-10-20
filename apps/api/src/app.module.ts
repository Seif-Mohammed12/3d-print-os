import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import configuration from './config/configuration';
import { GeometryModule } from './geometry/geometry.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './identity/identity.module';
import { PersistenceModule } from './infrastructure/persistence/persistence.module';
import { MaterialsModule } from './materials/materials.module';
import { OrdersModule } from './orders/orders.module';
import { PrintersModule } from './printers/printers.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { CalibrationModule } from './calibration/calibration.module';
import { MLModule } from './ml/ml.module';
import { CustomersModule } from './customers/customers.module';
import { PricingModule } from './pricing/pricing.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { TenancyModule } from './tenancy/tenancy.module';
import { QuotesModule } from './quotes/quotes.module';
import { PortalModule } from './portal/portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [],
      useFactory: () => {
        const ttl = Number(process.env.THROTTLE_TTL_MS ?? 60_000);
        const limit = Number(process.env.THROTTLE_LIMIT ?? 120);
        return [{ ttl, limit }];
      },
    }),
    PersistenceModule,
    IdentityModule,
    TenancyModule,
    GeometryModule,
    QuotesModule,
    CalibrationModule,
    PrintersModule,
    MaterialsModule,
    OrdersModule,
    AnalyticsModule,
    MLModule,
    CustomersModule,
    PricingModule,
    PortalModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
