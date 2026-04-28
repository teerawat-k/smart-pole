import { describe, test, expect } from "bun:test";
import {
  AppError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  RateLimitError,
} from "./app-error";
import { ErrorCode } from "./codes";

describe("AppError", () => {
  test("เก็บ statusCode/code/message ตรงตามที่ส่งเข้า", () => {
    const err = new AppError(418, "TEAPOT-001", "ฉันคือกาน้ำชา");
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe("TEAPOT-001");
    expect(err.message).toBe("ฉันคือกาน้ำชา");
    expect(err.name).toBe("AppError");
  });

  test("เป็น instance ของ Error", () => {
    const err = new AppError(500, "X-001", "boom");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("AppError subclasses statusCode mapping", () => {
  test("NotFoundError = 404", () => {
    const err = new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสา");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("NotFoundError");
    expect(err).toBeInstanceOf(AppError);
  });

  test("DuplicateError = 409", () => {
    const err = new DuplicateError(ErrorCode.USER_DUPLICATE_USERNAME, "ซ้ำ");
    expect(err.statusCode).toBe(409);
    expect(err.name).toBe("DuplicateError");
  });

  test("ValidationError = 400", () => {
    const err = new ValidationError(ErrorCode.COMMON_VALIDATION, "ข้อมูลไม่ถูกต้อง");
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe("ValidationError");
  });

  test("UnauthorizedError = 401", () => {
    const err = new UnauthorizedError(ErrorCode.AUTH_TOKEN_EXPIRED, "Token หมดอายุ");
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe("UnauthorizedError");
  });

  test("ForbiddenError = 403", () => {
    const err = new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "ไม่มีสิทธิ์");
    expect(err.statusCode).toBe(403);
    expect(err.name).toBe("ForbiddenError");
  });

  test("ConflictError = 409", () => {
    const err = new ConflictError(ErrorCode.COMMON_CONFLICT, "ลบไม่ได้");
    expect(err.statusCode).toBe(409);
    expect(err.name).toBe("ConflictError");
  });

  test("RateLimitError = 429", () => {
    const err = new RateLimitError(ErrorCode.COMMON_RATE_LIMIT, "ขออภัย");
    expect(err.statusCode).toBe(429);
    expect(err.name).toBe("RateLimitError");
  });
});

describe("ErrorCode catalog", () => {
  test("ทุก code ตรงรูปแบบ MODULE-NNN", () => {
    const pattern = /^[A-Z]+-\d{3}$/;
    for (const [key, value] of Object.entries(ErrorCode)) {
      expect(value, `${key} must match MODULE-NNN`).toMatch(pattern);
    }
  });

  test("ไม่มี code ซ้ำในตาราง", () => {
    const values = Object.values(ErrorCode);
    expect(new Set(values).size).toBe(values.length);
  });
});
