import axios from 'axios';

import type { ApiError as ApiErrorResponse } from '../types/api-types';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: unknown[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function handleApiError(error: unknown): never {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const apiError = error.response?.data?.error;

    if (apiError) {
      throw new ApiError(
        apiError.message,
        apiError.code,
        error.response?.status || 500,
        apiError.details,
      );
    }

    // Network error or no error response
    throw new ApiError(
      error.response
        ? `The server responded with an error (${error.response.status}).`
        : "Can't reach the server. Check your connection and try again.",
      'network_error',
      error.response?.status || 0,
    );
  }

  if (error instanceof Error) {
    throw new ApiError(error.message, 'unknown_error', 500);
  }

  throw new ApiError('An unknown error occurred', 'unknown_error', 500);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
