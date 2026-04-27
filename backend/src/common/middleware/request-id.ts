import { Elysia } from "elysia";
import { randomUUID } from "node:crypto";
import { logger } from "@/plugins/logger";

// ── Request ID middleware ──────────────────────────────────
// - generate UUID v4 ที่ onRequest (run ก่อน routing → ใช้ใน onError ของ NOT_FOUND ได้)
// - แนบ X-Request-Id header ทุก response
// - log: { requestId, method, path, statusCode, duration }
//
// requestId เก็บใน `store` (request-scoped) เพื่อให้ onError + handler เข้าถึงได้
export const requestIdPlugin = new Elysia({ name: "request-id" })
  .state("requestId", "")
  .state("startedAt", 0)
  .onRequest(({ request, set, store }) => {
    const incoming = request.headers.get("x-request-id");
    const requestId = incoming && /^[\w-]{8,128}$/.test(incoming) ? incoming : randomUUID();
    store.requestId = requestId;
    store.startedAt = Date.now();
    set.headers["x-request-id"] = requestId;
  })
  .onAfterResponse(({ request, set, store }) => {
    const duration = Date.now() - store.startedAt;
    const statusCode = typeof set.status === "number" ? set.status : 200;
    const url = new URL(request.url);
    logger.info(
      {
        requestId: store.requestId,
        method: request.method,
        path: url.pathname,
        statusCode,
        duration,
      },
      "request",
    );
  });
