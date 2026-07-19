export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown[];
    request_id?: string;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    per_page: number;
    total_pages: number;
  };
}
