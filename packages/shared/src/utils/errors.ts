import { ERROR_CODES } from "../constants/index.js";

export class AppError extends Error {
  constructor(
    public readonly code: keyof typeof ERROR_CODES,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super("NOT_FOUND", `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super("CONFLICT", message, 409);
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    details?: Array<{ field: string; message: string }>
  ) {
    super("VALIDATION_ERROR", message, 400, details);
  }
}

export class TenantSuspendedError extends AppError {
  constructor() {
    super("TENANT_SUSPENDED", "Tenant is suspended", 403);
  }
}
