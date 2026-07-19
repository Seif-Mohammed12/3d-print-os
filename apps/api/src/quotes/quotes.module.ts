import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import type { Pool } from 'pg';

import { QuoteRepository } from './repositories/quote.repository';
import { QuotesController } from './quotes.controller';
import { PrintPreparationController } from './print-preparation.controller';
import { QuoteService } from './services/quote.service';
import { GeometryIntegrationService } from './services/geometry-integration.service';
import { PricingIntegrationService } from './services/pricing-integration.service';
import { PrintEstimatorService } from './services/print-estimator.service';
import { CostCalculatorService } from './services/cost-calculator.service';
import { PricingEngineService } from './services/pricing-engine.service';
import { GeometryAnalyzerService } from './services/geometry-analyzer.service';
import { OrientationOptimizerService } from './services/orientation-optimizer.service';
import { SupportAnalyzerService } from './services/support-analyzer.service';
import { GeometricSupportAnalyzerService } from './services/support/support-analyzer.service';
import { MeshAnalyzerService } from './services/orientation/mesh-analyzer.service';
import { SurfaceDetectorService } from './services/orientation/surface-detector.service';
import { OrientationGeneratorService } from './services/orientation/orientation-generator.service';
import { OrientationEvaluatorService } from './services/orientation/orientation-evaluator.service';
import { SupportEstimatorService } from './services/orientation/support-estimator.service';
import { RiskAnalyzerService } from './services/orientation/risk-analyzer.service';
import { ScoringEngineService } from './services/orientation/scoring-engine.service';
import { DATABASE_POOL } from '../config/tokens';
import { MaterialsModule } from '../materials/materials.module';
import { OrdersModule } from '../orders/orders.module';
import { OrderService } from '../orders/services/order.service';

@Module({
  imports: [HttpModule, MaterialsModule, OrdersModule],
  controllers: [QuotesController, PrintPreparationController],
  providers: [
    {
      provide: 'QUOTE_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new QuoteRepository(pool),
    },
    {
      provide: QuoteService,
      inject: [
        'QUOTE_REPOSITORY',
        GeometryIntegrationService,
        PrintEstimatorService,
        CostCalculatorService,
        PricingEngineService,
        'ORDER_SERVICE',
      ],
      useFactory: (
        repo: QuoteRepository,
        geometryService: GeometryIntegrationService,
        printEstimatorService: PrintEstimatorService,
        costCalculatorService: CostCalculatorService,
        pricingEngineService: PricingEngineService,
        orderService: unknown,
      ) =>
        new QuoteService(
          repo,
          geometryService,
          printEstimatorService,
          costCalculatorService,
          pricingEngineService,
          orderService as OrderService,
        ),
    },
    GeometryIntegrationService,
    PricingIntegrationService,
    PrintEstimatorService,
    CostCalculatorService,
    PricingEngineService,
    GeometryAnalyzerService,
    MeshAnalyzerService,
    SurfaceDetectorService,
    OrientationGeneratorService,
    OrientationEvaluatorService,
    SupportEstimatorService,
    RiskAnalyzerService,
    ScoringEngineService,
    OrientationOptimizerService,
    SupportAnalyzerService,
    GeometricSupportAnalyzerService,
  ],
  exports: [
    QuoteService,
    GeometryIntegrationService,
    PricingIntegrationService,
    PrintEstimatorService,
    CostCalculatorService,
    PricingEngineService,
    GeometryAnalyzerService,
    OrientationOptimizerService,
    SupportAnalyzerService,
    MeshAnalyzerService,
    SurfaceDetectorService,
    OrientationGeneratorService,
    OrientationEvaluatorService,
    SupportEstimatorService,
    RiskAnalyzerService,
    ScoringEngineService,
  ],
})
export class QuotesModule {}
