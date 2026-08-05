// ── Sensor Push controller — admin status (read-only) ──
import { Elysia } from "elysia";
import { sensorPushService } from "./sensor-push.service";
import { authGuard } from "@/plugins/jwt";
import { requirePermission } from "@/common/middleware/require-permission";

export const sensorPushController = new Elysia({ prefix: "/api/sensor-push" })
  .use(authGuard)
  .get(
    "/status",
    async () => {
      const data = await sensorPushService.status();
      return { success: true, data };
    },
    { beforeHandle: requirePermission("pole:view") },
  );
