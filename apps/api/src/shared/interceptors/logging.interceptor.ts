import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

import { createLogger } from '@3d-print-os/observability';

import { getRequestId } from '../middleware/request-id.middleware';

const logger = createLogger({ service: 'api-http' });

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const started = Date.now();
    const requestId = getRequestId(request);

    return next.handle().pipe(
      tap({
        next: () => {
          logger.info(
            {
              request_id: requestId,
              method: request.method,
              path: request.originalUrl,
              status_code: response.statusCode,
              latency_ms: Date.now() - started,
            },
            'request completed',
          );
        },
        error: () => {
          logger.warn(
            {
              request_id: requestId,
              method: request.method,
              path: request.originalUrl,
              latency_ms: Date.now() - started,
            },
            'request failed',
          );
        },
      }),
    );
  }
}
