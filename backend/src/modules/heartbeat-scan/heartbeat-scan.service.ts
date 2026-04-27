// ── Heartbeat scan service — register cron job ─────────────
import { registerJob } from "@/plugins/scheduler";
import { scanOfflinePoles } from "./flow/scan-offline-poles";

export const heartbeatScanService = {
  /** call this once at startup */
  start(): void {
    registerJob({
      name: "heartbeat-offline-scan",
      cronExpression: "*/1 * * * *", // ทุก 1 นาที
      fn: async () => {
        await scanOfflinePoles();
      },
    });
  },

  /** manual trigger — สำหรับ test/admin */
  scan: scanOfflinePoles,
};
