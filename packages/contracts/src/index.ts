/**
 * API contract placeholders. OpenAPI becomes source of truth in later milestones.
 */

export const API_VERSION = 'v1' as const;

export type ApiSuccessMeta = {
  request_id: string;
  api_version: typeof API_VERSION;
};

export type ApiSuccess<T> = {
  data: T;
  meta: ApiSuccessMeta;
};

export type ApiErrorDetail = {
  field?: string;
  code: string;
  message: string;
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: ApiErrorDetail[];
    request_id: string;
  };
};

/** Liveness — process is up. Shape must remain stable. */
export type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
};

export type HealthCheckStatus = 'up' | 'down' | 'skipped';

export type ReadyHealthResponse = {
  status: 'ok' | 'degraded';
  service: string;
  timestamp: string;
  checks: {
    database: HealthCheckStatus;
    redis: HealthCheckStatus;
  };
};
