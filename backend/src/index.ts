import "./config/env";

import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { staticPlugin } from "@elysiajs/static";
import { env } from "./config/env";
import { logger } from "./plugins/logger";
import { AppError } from "./common/errors";

// Module controllers — register ที่ตำแหน่งนี้
// import { authController } from "./modules/auth";
// import { branchController } from "./modules/branch";

const app = new Elysia()
  .use(cors({ origin: env.CORS_ORIGIN, methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"] }))
  .use(swagger({ path: "/swagger" }))
  .use(staticPlugin({ prefix: "/uploads", assets: env.UPLOAD_DIR }))
  .onError(({ error, set, code, request }) => {
    const ctx = { method: request.method, url: request.url };

    if (code === "NOT_FOUND") {
      logger.warn(ctx, "Route not found");
      set.status = 404;
      return { success: false, error: { code: "NOT_FOUND", message: "ไม่พบ API endpoint นี้" } };
    }

    if (code === "VALIDATION") {
      logger.warn(ctx, "Request validation failed");
      set.status = 400;
      return { success: false, error: { code: "VALIDATION_ERROR", message: "ข้อมูลไม่ถูกต้อง" } };
    }

    if (error instanceof AppError) {
      logger.warn({ ...ctx, code: error.code }, error.message);
      set.status = error.statusCode;
      return { success: false, error: { code: error.code, message: error.message } };
    }

    logger.error({ err: error, ...ctx }, "Unexpected system error");
    set.status = 500;
    return { success: false, error: { code: "INTERNAL_ERROR", message: "เกิดข้อผิดพลาดภายในระบบ" } };
  })
  .get("/health", () => ({ success: true, data: { status: "ok" } }))
  .listen(env.PORT);

logger.info(`Server running on http://localhost:${env.PORT}`);

export type App = typeof app;
