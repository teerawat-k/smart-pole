import { Elysia } from "elysia";
import { auditService } from "./audit.service";
import { auditListQuery } from "./audit.schema";
import { authGuard } from "@/plugins/jwt";
import { requirePermission } from "@/common/middleware/require-permission";

// audit log = admin/support เท่านั้น — ใช้ system_log:view ร่วมกัน (admin function)
export const auditController = new Elysia({ prefix: "/api/audit-logs" })
  .use(authGuard)
  .get(
    "/",
    async ({ query }) => {
      const result = await auditService.list({
        page: query.page,
        limit: query.limit,
        module: query.module,
        action: query.action,
        userId: query.userId,
        targetId: query.targetId,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
      return {
        success: true,
        data: result.data,
        total: result.total,
        page: query.page,
        limit: query.limit,
      };
    },
    { query: auditListQuery, beforeHandle: requirePermission("system_log:view") },
  );
