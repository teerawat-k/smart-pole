import { t } from "elysia";

export const PASSWORD_MIN_LENGTH = 8;

/**
 * Password TypeBox schema — ใช้ใน register/reset/change password endpoints
 * Validation rules:
 * - อย่างน้อย 8 ตัวอักษร
 * - ต้องมีตัวเลขอย่างน้อย 1 ตัว
 * - ต้องมีตัวอักษรอย่างน้อย 1 ตัว
 */
export const passwordSchema = t.String({
  minLength: PASSWORD_MIN_LENGTH,
  pattern: "^(?=.*[A-Za-z])(?=.*\\d).{8,}$",
  description: "รหัสผ่านต้องอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข",
});

export const changePasswordSchema = t.Object({
  currentPassword: t.String({ minLength: 1 }),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema,
});

/** ตรวจ match newPassword กับ confirmPassword (ใช้ใน service หลัง parse) */
export function isPasswordConfirmed(input: { newPassword: string; confirmPassword: string }): boolean {
  return input.newPassword === input.confirmPassword;
}
