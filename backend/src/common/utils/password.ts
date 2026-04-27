import { hash, verify } from "argon2";

/**
 * Hash password using argon2id (default algorithm in argon2 npm package).
 * Production: ใช้ default cost — argon2id 64MB memory + 3 iterations
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

/**
 * Verify password against argon2id hash.
 * รองรับ legacy bcrypt verify ผ่าน fallback ใน auth service ถ้าจำเป็น (ดู E01.T02)
 */
export async function verifyPassword(hashed: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    // hash format invalid → return false (กัน timing leak ของการ throw)
    return false;
  }
}
