import { expect } from "bun:test";
import { AppError } from "@/common/errors";

/**
 * Helper: assert promise reject ด้วย AppError ที่ code ตรง
 * (กัน Bun bug: `expect(...).rejects` บางทีไม่ catch ทัน)
 *
 * @example
 * await expectError(service.create(input), ErrorCode.POLE_DUPLICATE_NAME);
 */
export async function expectError(promise: Promise<unknown>, code: string): Promise<AppError> {
  try {
    await promise;
    throw new Error(`Expected to throw with code "${code}" but resolved`);
  } catch (err) {
    if (!(err instanceof AppError)) {
      throw new Error(
        `Expected AppError but got ${err instanceof Error ? err.constructor.name : typeof err}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    expect(err.code).toBe(code);
    return err;
  }
}
