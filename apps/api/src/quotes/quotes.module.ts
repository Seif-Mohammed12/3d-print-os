import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import type { Pool } from 'pg';
import type { ModelUploadService } from '@3d-print-os/geometry';
import type { ObjectStoragePort } from '@3d-print-os/storage';

import { QuoteRepository } from './repositories/quote.repository';
import { QuotesController } from './quotes.controller';
import { QuoteService } from './services/quote.service';
import { SlicerClientService } from './services/slicer-client.service';
import { PrintEstimatorService } from './services/print-estimator.service';
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
import { CalibrationModule } from '../calibration/calibration.module';
import { CalibrationService } from '../calibration/calibration.service';
import { DATABASE_POOL } from '../config/tokens';
import { GeometryModule } from '../geometry/geometry.module';
import { MODEL_UPLOAD_SERVICE, OBJECT_STORAGE } from '../geometry/geometry.tokens';
import { MaterialsModule } from '../materials/materials.module';
import { MaterialService } from '../materials/services/material.service';
import { OrdersModule } from '../orders/orders.module';
import { OrderService } from '../orders/services/order.service';
import { PricingModule } from '../pricing/pricing.module';
import { PricingService } from '../pricing/services/pricing.service';
import { PrintersModule } from '../printers/printers.module';
import { PrinterService } from '../printers/services/printer.service';

@Module({
  imports: [
    HttpModule,
    CalibrationModule,
    GeometryModule,
    MaterialsModule,
    OrdersModule,
    PricingModule,
    PrintersModule,
  ],
  controllers: [QuotesController],
  providers: [
    // Triangle-based print preparation helpers (quotes themselves are priced by the slicer)
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
    PrintEstimatorService,

    SlicerClientService,
    {
      provide: 'QUOTE_REPOSITORY',
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool) => new QuoteRepository(pool),
    },
    {
      provide: QuoteService,
      inject: [
        'QUOTE_REPOSITORY',
        SlicerClientService,
        PrinterService,
        MaterialService,
        PricingService,
        MODEL_UPLOAD_SERVICE,
        OBJECT_STORAGE,
        OrderService,
        CalibrationService,
      ],
      useFactory: (
        repo: QuoteRepository,
        slicer: SlicerClientService,
        printers: PrinterService,
        materials: MaterialService,
        pricing: PricingService,
        modelUploads: ModelUploadService,
        storage: ObjectStoragePort,
        orders: OrderService,
        calibration: CalibrationService,
      ) =>
        new QuoteService(
          repo,
          slicer,
          printers,
          materials,
          pricing,
          modelUploads,
          storage,
          orders,
          calibration,
        ),
    },
  ],
  exports: [
    QuoteService,
    GeometryAnalyzerService,
    OrientationOptimizerService,
    SupportAnalyzerService,
    PrintEstimatorService,
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
