import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';

import { CurrentAuth } from '../identity/auth.decorators';
import type { RequestAuthContext } from '../identity/auth.types';
import { CalibrationQueryDto, RecordPrintOutcomeDto } from './calibration.dto';
import { CalibrationService } from './calibration.service';

@Controller()
export class CalibrationController {
  constructor(private calibrationService: CalibrationService) {}

  /** Staff record the actual print time and/or grams once production is completed. */
  @Put('orders/:orderId/print-outcome')
  async recordOutcome(
    @Param('orderId') orderId: string,
    @Body() dto: RecordPrintOutcomeDto,
    @CurrentAuth() auth: RequestAuthContext,
  ) {
    const outcome = await this.calibrationService.recordOutcome(
      orderId,
      auth.tenantId,
      auth.userId ?? null,
      dto,
    );
    return { data: outcome };
  }

  @Get('orders/:orderId/print-outcome')
  async getOutcome(@Param('orderId') orderId: string, @CurrentAuth() auth: RequestAuthContext) {
    const outcome = await this.calibrationService.getOutcome(orderId, auth.tenantId);
    return { data: outcome };
  }

  /** Current correction factors per printer, with per-material breakdown. */
  @Get('calibration/printers')
  async listPrinters(@Query() query: CalibrationQueryDto, @CurrentAuth() auth: RequestAuthContext) {
    return this.calibrationService.listPrinterCalibration(auth.tenantId, query.printerId);
  }
}
