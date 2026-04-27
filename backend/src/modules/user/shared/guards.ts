import { prisma } from "@/plugins/prisma";
import { userRepository } from "../user.repository";
import { ConflictError, ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

const ADMIN_ROLE_NAME = "admin";

/**
 * ป้องกันการลบ/disable ตัวเอง
 * @throws ForbiddenError ถ้า targetUserId === requestUserId
 */
export function assertNotSelf(targetUserId: number, requestUserId: number): void {
  if (targetUserId === requestUserId) {
    throw new ForbiddenError(ErrorCode.USER_CANNOT_DELETE_SELF, "ไม่สามารถดำเนินการกับบัญชีของตนเอง");
  }
}

/**
 * ป้องกัน admin คนสุดท้ายในระบบถูก disable/delete
 * @throws ConflictError ถ้าจะเหลือ admin active < 1
 */
export async function assertNotLastActiveAdmin(targetUserId: number): Promise<void> {
  const target = await userRepository.findById(targetUserId);
  if (!target || target.role.name !== ADMIN_ROLE_NAME) return;

  const adminRole = await prisma.role.findUnique({ where: { name: ADMIN_ROLE_NAME } });
  if (!adminRole) return;

  const activeAdmins = await userRepository.countActiveAdmins(adminRole.id);
  if (activeAdmins <= 1) {
    throw new ConflictError(ErrorCode.USER_LAST_ADMIN, "ต้องมี admin ที่ใช้งานได้อย่างน้อย 1 คน");
  }
}
