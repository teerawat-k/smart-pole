import { Elysia } from "elysia";
import { auditService } from "./audit.service";
import { auditListQuery } from "./audit.schema";

// TODO(E08+): wrap ด้วย authPlugin + requirePermission("audit_log", "canView")
// ตอนนี้ public ก่อน — ทำให้ frontend integration test ได้
export const auditController = new Elysia({ prefix: "/api/audit-logs" })
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
    { query: auditListQuery },
  );
