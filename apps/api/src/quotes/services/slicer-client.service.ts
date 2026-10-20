import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

import type { AppConfig } from '../../config/configuration';
import { APP_CONFIG } from '../../config/tokens';
import { AppError } from '../../shared/errors/app.error';
import type { OrientationMode, SliceSettings } from '../domain/slice-settings';

export type SliceFeatureUsage = { feature: string; filament_mm: number; grams: number };

export type SliceEstimate = {
  print_time_s: number;
  filament_mm: number;
  filament_cm3: number;
  filament_g: number;
  support_g: number;
  layer_count: number;
  object_height_mm: number;
  features: SliceFeatureUsage[];
};

export type SliceCandidate = {
  label: string;
  rotation: number[][];
  size_mm: number[];
  estimate: SliceEstimate | null;
  score: number | null;
  error: string | null;
};

export type SliceResult = {
  slicer: { name: string; version: string };
  estimate: SliceEstimate;
  orientation: SliceCandidate;
  candidates: SliceCandidate[];
  mesh_volume_mm3: number;
  mesh_is_watertight: boolean;
  warnings: string[];
};

export type SliceRequest = {
  tenantId: string;
  modelFileId: string;
  downloadUrl: string;
  fileType: 'stl' | 'obj' | '3mf';
  settings: SliceSettings;
  orientation: OrientationMode;
  /** Relative costs (minor units) used to rank orientation candidates. */
  selection: { cost_per_hour: number; cost_per_gram: number; support_penalty_per_gram: number };
};

type GeometryErrorBody = { error?: { code?: string; message?: string } };

type HttpErrorWithResponse = { response: { status: number; data?: GeometryErrorBody } };

function hasResponse(error: unknown): error is HttpErrorWithResponse {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: unknown }).response !== null
  );
}

// Geometry-service error codes that mean "this model/settings combination cannot be quoted".
const UNPROCESSABLE: Record<string, string> = {
  model_too_large: 'quote.model_too_large',
  invalid_slice_settings: 'quote.invalid_slice_settings',
  invalid_orientation: 'quote.invalid_slice_settings',
  invalid_stl: 'quote.invalid_model',
  limit_exceeded: 'quote.invalid_model',
  slicing_failed: 'quote.slicing_failed',
  gcode_parse_failed: 'quote.slicing_failed',
};

@Injectable()
export class SlicerClientService {
  private readonly logger = new Logger(SlicerClientService.name);

  constructor(
    private readonly http: HttpService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async slice(request: SliceRequest): Promise<SliceResult> {
    try {
      const response = await firstValueFrom(
        this.http.post<SliceResult>(
          `${this.config.geometryServiceUrl}/slice`,
          {
            tenant_id: request.tenantId,
            model_file_id: request.modelFileId,
            download_url: request.downloadUrl,
            file_type: request.fileType,
            settings: request.settings,
            orientation: { mode: request.orientation },
            selection: request.selection,
          },
          { timeout: this.config.sliceTimeoutMs },
        ),
      );
      return response.data;
    } catch (error) {
      throw this.toAppError(error);
    }
  }

  private toAppError(error: unknown): AppError {
    if (hasResponse(error)) {
      const body = error.response.data?.error;
      const mapped = body?.code ? UNPROCESSABLE[body.code] : undefined;
      if (mapped) {
        return new AppError({
          code: mapped,
          message: body?.message ?? 'The model could not be sliced',
          statusCode: 422,
        });
      }
      this.logger.error(
        `Slicing failed with status ${error.response.status}: ${body?.code ?? 'unknown'}`,
      );
    } else {
      this.logger.error(`Geometry service unreachable: ${(error as Error).message}`);
    }
    return new AppError({
      code: 'quote.slicer_unavailable',
      message: 'The slicing service is unavailable; try again shortly',
      statusCode: 503,
      cause: error,
    });
  }
}
