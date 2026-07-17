/**
 * API contract placeholders. OpenAPI becomes source of truth in later milestones.
 * No business endpoints yet — only shared envelope shapes.
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

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details: Array<{ field?: string; code: string; message: string }>;
    request_id: string;
  };
};

export type HealthResponse = {
  status: 'ok';
  service: string;
  timestamp: string;
};
