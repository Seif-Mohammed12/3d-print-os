import { Injectable, NotFoundException } from '@nestjs/common';

import {
  CALIBRATION_DEFAULTS,
  resolveCalibration,
  summarizePrinterCalibration,
  type CorrectionFactor,
  type PrinterCalibration,
} from '../quotes/domain/calibration';
import { AppError } from '../shared/errors/app.error';
import type { RecordPrintOutcomeDto } from './calibration.dto';
import type { CalibrationRepository, PrintOutcome } from './calibration.repository';

function unprocessable(code: string, message: string): AppError {
  return new AppError({ code, message, statusCode: 422 });
}

function factorView(f: CorrectionFactor) {
  return {
    factor: f.factor,
    applied: f.applied,
    sample_count: f.sampleCount,
    median_ratio: f.medianRatio,
    scope: f.scope,
  };
}

@Injectable()
export class CalibrationService {
  constructor(private repo: CalibrationRepository) {}

  /** Factors for a quote's printer and material; 1.0 until enough outcomes are recorded. */
  async getCalibration(
    tenantId: string,
    printerId: string,
    materialId: string,
  ): Promise<PrinterCalibration> {
    const samples = await this.repo.listSamples(tenantId, printerId);
    return resolveCalibration(samples, { printerId, materialId }, CALIBRATION_DEFAULTS);
  }

  /**
   * Record what a completed job actually took. The estimate is snapshotted from the
   * quote's raw slicer output so later re-pricing cannot change the sample.
   */
  async recordOutcome(
    orderId: string,
    tenantId: string,
    userId: string | null,
    dto: RecordPrintOutcomeDto,
  ): Promise<PrintOutcome> {
    const actualPrintMinutes = dto.actualPrintMinutes ?? null;
    const actualFilamentGrams = dto.actualFilamentGrams ?? null;
    if (actualPrintMinutes === null && actualFilamentGrams === null) {
      throw unprocessable(
        'print_outcome.empty',
        'Provide the actual print minutes, the actual grams used, or both',
      );
    }

    const context = await this.repo.getOrderContext(orderId, tenantId);
    if (!context) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }
    if (context.production_status !== 'completed') {
      throw new AppError({
        code: 'print_outcome.production_not_completed',
        message: 'Mark production as completed before recording the actual print outcome',
        statusCode: 409,
      });
    }

    const estimate = context.slice_result?.estimate;
    const estimatedTime = Number(estimate?.print_time_s);
    const estimatedGrams = Number(estimate?.filament_g);
    if (
      context.estimate_source !== 'slicer' ||
      !context.quote_printer_id ||
      !context.material_id ||
      !(estimatedTime > 0) ||
      !(estimatedGrams > 0)
    ) {
      throw unprocessable(
        'print_outcome.no_slicer_estimate',
        "The order's quote was not priced by the slicer, so there is no estimate to compare with",
      );
    }

    if (dto.printedOnPrinterId) {
      const printers = await this.repo.listPrinters(tenantId);
      if (!printers.some((p) => p.id === dto.printedOnPrinterId)) {
        throw unprocessable(
          'print_outcome.unknown_printer',
          'printedOnPrinterId is not a printer of this shop',
        );
      }
    }

    const printedOn = dto.printedOnPrinterId ?? context.order_printer_id;
    return this.repo.upsertOutcome({
      tenantId,
      shopId: context.shop_id,
      orderId,
      quoteId: context.quote_id,
      printerId: context.quote_printer_id,
      materialId: context.material_id,
      printedOnPrinterId: printedOn ?? null,
      slicerVersion: context.slice_result?.slicer?.version ?? null,
      estimatedPrintTimeSeconds: estimatedTime,
      estimatedFilamentGrams: estimatedGrams,
      actualPrintMinutes,
      actualFilamentGrams,
      notes: dto.notes ?? null,
      recordedBy: userId,
    });
  }

  async getOutcome(orderId: string, tenantId: string): Promise<PrintOutcome> {
    const outcome = await this.repo.findByOrder(orderId, tenantId);
    if (!outcome) {
      throw new NotFoundException(`No print outcome recorded for order ${orderId}`);
    }
    return outcome;
  }

  async listPrinterCalibration(tenantId: string, printerId?: string) {
    const [printers, samples, materialNames] = await Promise.all([
      this.repo.listPrinters(tenantId),
      this.repo.listSamples(tenantId, printerId),
      this.repo.listMaterialNames(tenantId),
    ]);
    const selected = printerId ? printers.filter((p) => p.id === printerId) : printers;
    if (printerId && selected.length === 0) {
      throw new NotFoundException(`Printer with ID ${printerId} not found`);
    }

    return {
      data: selected.map((printer) => {
        const summary = summarizePrinterCalibration(printer.id, samples, CALIBRATION_DEFAULTS);
        return {
          printer_id: printer.id,
          printer_name: printer.name,
          printer_status: printer.status,
          print_time: factorView(summary.printTime),
          filament: factorView(summary.filament),
          materials: summary.materials.map((m) => ({
            material_id: m.materialId,
            material_name: materialNames.get(m.materialId) ?? null,
            print_time: factorView(m.printTime),
            filament: factorView(m.filament),
          })),
        };
      }),
      meta: {
        window: CALIBRATION_DEFAULTS.window,
        min_samples: CALIBRATION_DEFAULTS.minSamples,
        factor_bounds: [CALIBRATION_DEFAULTS.minFactor, CALIBRATION_DEFAULTS.maxFactor],
      },
    };
  }
}
