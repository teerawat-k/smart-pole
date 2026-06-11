import { Elysia } from "elysia";
import { systemLogService } from "./system-log.service";
import { systemLogListQuery } from "./system-log.schema";
import { authGuard } from "@/plugins/jwt";
import { requirePermission } from "@/common/middleware/require-permission";

export const systemLogController = new Elysia({ prefix: "/api/system-logs" })
  .use(authGuard)
  .get(
    "/",
    async ({ query }) => {
      const result = await systemLogService.list({
        page: query.page,
        limit: query.limit,
        logType: query.logType,
        userId: query.userId,
        search: query.search,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: systemLogListQuery, beforeHandle: requirePermission("system_log:view") },
  );
