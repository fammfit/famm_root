import type { ApiResponse, ApiError, PaginatedResponse } from "../types/api.js";

export function success<T>(data: T, requestId?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      requestId,
    },
  };
}

export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  requestId?: string
): PaginatedResponse<T> {
  const pages = Math.ceil(total / limit);
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: "1.0",
      requestId,
    },
    pagination: {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    },
  };
}

export function error(
  code: string,
  message: string,
  details?: Array<{ field: string; message: string }>,
  requestId?: string
): ApiError {
  return {
    success: false,
    error: { code, message, details },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}
