import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { ApiErrorBody } from '@3d-print-os/contracts';
import { createLogger } from '@3d-print-os/observability';

import { AppError } from '../errors/app.error';
import { REQUEST_ID_HEADER, getRequestId } from '../middleware/request-id.middleware';

const logger = createLogger({ service: 'api-errors' });

@Injectable()
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = getRequestId(request);

    const { statusCode, body } = this.toErrorBody(exception, requestId);

    logger.error(
      {
        request_id: requestId,
        status_code: statusCode,
        path: request.originalUrl,
        method: request.method,
        error_code: body.error.code,
        err: exception instanceof Error ? exception : undefined,
      },
      body.error.message,
    );

    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.status(statusCode).json(body);
  }

  private toErrorBody(
    exception: unknown,
    requestId: string,
  ): { statusCode: number; body: ApiErrorBody } {
    if (exception instanceof AppError) {
      return {
        statusCode: exception.statusCode,
        body: {
          error: {
            code: exception.code,
            message: exception.message,
            details: exception.details,
            request_id: requestId,
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const { message, details } = this.normalizeHttpPayload(payload);

      return {
        statusCode,
        body: {
          error: {
            code: this.httpStatusToCode(statusCode),
            message,
            details,
            request_id: requestId,
          },
        },
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        error: {
          code: 'internal.unexpected',
          message: 'An unexpected error occurred',
          details: [],
          request_id: requestId,
        },
      },
    };
  }

  private normalizeHttpPayload(payload: string | object): {
    message: string;
    details: ApiErrorBody['error']['details'];
  } {
    if (typeof payload === 'string') {
      return { message: payload, details: [] };
    }

    const record = payload as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(record.message)) {
      return {
        message: 'Validation failed',
        details: record.message.map((item) => ({
          code: 'validation.failed',
          message: item,
        })),
      };
    }

    return {
      message: record.message ?? record.error ?? 'Request failed',
      details: [],
    };
  }

  private httpStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'http.bad_request';
      case HttpStatus.UNAUTHORIZED:
        return 'http.unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'http.forbidden';
      case HttpStatus.NOT_FOUND:
        return 'http.not_found';
      case HttpStatus.CONFLICT:
        return 'http.conflict';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'http.unprocessable_entity';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'http.rate_limited';
      default:
        return 'http.error';
    }
  }
}
