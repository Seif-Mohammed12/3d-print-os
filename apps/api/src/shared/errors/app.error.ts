export type AppErrorDetail = {
  field?: string;
  code: string;
  message: string;
};

export type AppErrorOptions = {
  code: string;
  message: string;
  statusCode?: number;
  details?: AppErrorDetail[];
  cause?: unknown;
};

/**
 * Typed application error mapped to the API error envelope by the global filter.
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details: AppErrorDetail[];

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details ?? [];
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details: AppErrorDetail[] = []) {
    super({
      code: 'validation.failed',
      message,
      statusCode: 400,
      details,
    });
    this.name = 'ValidationAppError';
  }
}

export class NotFoundAppError extends AppError {
  constructor(message = 'Resource not found', code = 'resource.not_found') {
    super({ code, message, statusCode: 404 });
    this.name = 'NotFoundAppError';
  }
}
