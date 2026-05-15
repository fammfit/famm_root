import { NextResponse } from "next/server";
import { AppError } from "@famm/shared";
import { ZodError } from "zod";

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { timestamp: new Date().toISOString(), version: "1.0" },
    },
    { status }
  );
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Array<{ field: string; message: string }>
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: { timestamp: new Date().toISOString() },
    },
    { status }
  );
}

export function handleError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    return apiError("VALIDATION_ERROR", "Validation failed", 400, details);
  }
  console.error("[API Error]", err);
  return apiError("INTERNAL_ERROR", "An unexpected error occurred", 500);
}
