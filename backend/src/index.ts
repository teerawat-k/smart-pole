import "./config/env";

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { env, isProd } from "./config/env";
import { logger } from "./plugins/logger";
import { prisma, pingDb } from "./plugins/prisma";
import { requestIdPlugin } from "./common/middleware/request-id";
import { AppError } from "./common/errors";
import { auditController } from "./modules/audit";
import { roleController } from "./modules/role";
import { userController, meController } from "./modules/user";
import { authController, authProtectedController } from "./modules/auth";
import { captchaController } from "./modules/captcha";
import { poleController } from "./modules/pole";
import { sensorArchiveController } from "./modules/sensor-archive";
import { alertController } from "./modules/alert";
import { websocketPlugin } from "./plugins/websocket";
import { startMqttSubscriber, stopMqttSubscriber } from "./plugins/mqtt";
import { heartbeatScanService } from "./modules/heartbeat-scan";
import { stopAllJobs } from "./plugins/scheduler";

const app = new Elysia()
  .use(cors({ origin: env.CORS_ORIGIN, methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"], exposeHeaders: ["x-request-id"] }))
  .use(swagger({ path: "/swagger" }))
  .use(staticPlugin({ prefix: "/uploads", assets: env.UPLOAD_DIR }))
  .use(requestIdPlugin)
  .onError(({ error, set, code, request, store }) => {
    const requestId = store.requestId;
    const ctx = { requestId, method: request.method, url: request.url };

    if (code === "NOT_FOUND") {
      logger.warn(ctx, "Route not found");
      set.status = 404;
      return { success: false, error: { code: "NOT_FOUND", message: "ไม่พบ API endpoint นี้", requestId } };
    }

    if (code === "VALIDATION") {
      logger.warn(ctx, "Request validation failed");
      set.status = 400;
      return { success: false, error: { code: "VALIDATION_ERROR", message: "ข้อมูลไม่ถูกต้อง", requestId } };
    }

    if (error instanceof AppError) {
      logger.warn({ ...ctx, code: error.code }, error.message);
      set.status = error.statusCode;
      return { success: false, error: { code: error.code, message: error.message, requestId } };
    }

    logger.error({ err: error, ...ctx }, "Unexpected system error");
    set.status = 500;
    return { success: false, error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ", requestId } };
  })
  // ── Liveness — ไม่ต้อง auth, ไม่แตะ DB ──
  .get("/health", () => ({ success: true, data: { status: "ok" } }))
  // ── Readiness — แตะ DB เช็คว่าพร้อมรับ traffic ──
  .get("/health/ready", async ({ set }) => {
    const dbOk = await pingDb();
    if (!dbOk) {
      set.status = 503;
      return { success: false, error: { code: "DB_UNAVAILABLE", message: "ฐานข้อมูลไม่พร้อมใช้งาน" } };
    }
    return { success: true, data: { db: "ok" } };
  })
  // ── Module controllers ──
  .use(captchaController)
  .use(authController)
  .use(authProtectedController)
  .use(auditController)
  .use(roleController)
  .use(userController)
  .use(meController)
  .use(poleController)
  .use(sensorArchiveController)
  .use(alertController)
  .use(websocketPlugin)
  .listen(env.PORT);

logger.info(`🚀 Server running on http://localhost:${env.PORT} (${env.NODE_ENV})`);

// ── Start MQTT subscriber (best-effort) ──
try {
  startMqttSubscriber();
} catch (err) {
  logger.error({ err }, "MQTT: failed to start subscriber");
}

// ── Start scheduler jobs ──
try {
  heartbeatScanService.start();
} catch (err) {
  logger.error({ err }, "Scheduler: failed to start");
}

// ── Graceful shutdown ─────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down...");
  stopAllJobs();
  await stopMqttSubscriber().catch(() => undefined);
  await app.stop();
  await prisma.$disconnect();
  logger.info("Shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

if (isProd) {
  // เผื่อ uncaught — log + exit (ห้าม swallow ใน production)
  process.on("uncaughtException", (err) => {
    logger.fatal({ err }, "Uncaught exception");
    process.exit(1);
  });
  process.on("unhandledRejection", (reason) => {
    logger.fatal({ reason }, "Unhandled rejection");
    process.exit(1);
  });
}

export type App = typeof app;
