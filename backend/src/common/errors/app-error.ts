export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string) {
    super(404, code, message);
    this.name = "NotFoundError";
  }
}

export class DuplicateError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
    this.name = "DuplicateError";
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string) {
    super(400, code, message);
    this.name = "ValidationError";
  }
}

export class ForbiddenError extends AppError {
  constructor(code: string, message: string) {
    super(403, code, message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string) {
    super(409, code, message);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  constructor(code: string, message: string) {
    super(429, code, message);
    this.name = "RateLimitError";
  }
}
