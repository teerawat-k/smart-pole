import { auditRepository, type CreateAuditLogInput, type ListAuditLogParams } from "./audit.repository";
import { logger } from "@/plugins/logger";

/**
 * Audit log service
 *
 * **กฎสำคัญ:** `log()` คือ fire-and-forget — ห้าม `await auditService.log(...)`
 * - ใช้: `auditService.log({ ... })` (ไม่ await)
 * - fail ของ audit log ห้าม block business flow → log error ไปที่ pino เท่านั้น
 *
 * `list()` ใช้สำหรับ admin viewer (ต้องตรวจ permission `audit_log:canView`)
 */
export const auditService = {
  log(data: CreateAuditLogInput): void {
    auditRepository.create(data).catch((err: unknown) => {
      logger.error({ err, data }, "Failed to write audit log");
    });
  },

  async list(params: ListAuditLogParams) {
    return auditRepository.findMany(params);
  },
};
