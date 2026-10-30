import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(
    message: string = "You do not have permission to perform this action",
    details?: unknown
  ) {
    super(message, 403, "FORBIDDEN", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", details?: unknown) {
    super(message, 404, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

export class GoneError extends AppError {
  constructor(
    message: string = "Resource has expired or been revoked",
    details?: unknown
  ) {
    super(message, 410, "GONE", details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(
    message: string = "Unprocessable request payload",
    details?: unknown
  ) {
    super(message, 422, "UNPROCESSABLE_ENTITY", details);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: unknown) {
    super(message, 400, "BAD_REQUEST", details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too many requests", details?: unknown) {
    super(message, 429, "TOO_MANY_REQUESTS", details);
  }
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input parameters",
          details: error.flatten(),
        },
      },
      { status: 400 }
    );
  }

  console.error("[Unhandled API Error]:", error);

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 }
  );
}
