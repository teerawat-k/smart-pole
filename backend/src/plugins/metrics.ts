// ── Prometheus metrics ────────────────────────────────────
// Expose /metrics endpoint (no auth — bound only on internal network via docker-compose)
//
// Metrics:
//   - default node/runtime metrics (CPU, memory, GC, event loop) ผ่าน collectDefaultMetrics
//   - http_requests_total / http_request_duration_seconds (HTTP layer)
//   - mqtt_messages_total (sensor packet ingestion)
//   - poles_online (live gauge from heartbeat scan)
//   - ws_connections (live gauge from websocket registry)
//
// Architecture:
//   metricsPlugin → onRequest start timer → onAfterResponse stop + record
//   exported gauges อัปเดตจาก outside (heartbeat scan, ws registry) ผ่าน setter
//
// Cardinality control:
//   route label = normalized path (e.g. /api/poles/:id ไม่ใช่ /api/poles/123)
//   status label = HTTP status code

import { Elysia } from "elysia";
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from "prom-client";

export const registry = new Registry();
registry.setDefaultLabels({ service: "smart-pole-backend" });
collectDefaultMetrics({ register: registry });

// ── HTTP layer ──
const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

const httpDurationSeconds = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// ── MQTT layer ──
export const mqttMessagesTotal = new Counter({
  name: "mqtt_messages_total",
  help: "Total MQTT messages received from sensors",
  labelNames: ["sensor_type", "result"] as const, // result: ok|invalid|unknown_pole
  registers: [registry],
});

// ── Sensor health (per-pole observability) ──
// Reported by Pi via smartpole/<pole>/health every cycle
// outcome = ok | timeout | crc_error | out_of_range | serial_error | unknown
export const sensorReadsTotal = new Counter({
  name: "sensor_reads_total",
  help: "Sensor read attempts on Pi (reported via /health MQTT topic)",
  labelNames: ["pole", "outcome"] as const,
  registers: [registry],
});

// ── Sensor push (outbound to external receivers) ──
export const pushTotal = new Counter({
  name: "sensor_push_total",
  help: "Sensor push attempts to external receivers",
  labelNames: ["receiver", "status"] as const, // status: ok | <http-code> | 0(network)
  registers: [registry],
});

export const pushSkipped = new Counter({
  name: "sensor_push_skipped_total",
  help: "Sensor push skipped (freshness / dedup / circuit-open)",
  labelNames: ["receiver", "reason"] as const,
  registers: [registry],
});

// ── Domain gauges (updated from outside) ──
export const polesOnlineGauge = new Gauge({
  name: "smart_pole_poles_online",
  help: "Number of poles currently online",
  registers: [registry],
});

export const polesTotalGauge = new Gauge({
  name: "smart_pole_poles_total",
  help: "Total poles registered (excluding deleted)",
  registers: [registry],
});

export const wsConnectionsGauge = new Gauge({
  name: "smart_pole_ws_connections",
  help: "Active WebSocket connections",
  registers: [registry],
});

// ── Route normalizer — collapse :id params ──
// /api/poles/123 → /api/poles/:id ; /api/poles/123/maintenance → /api/poles/:id/maintenance
// Keep cardinality low (Prometheus best practice)
function normalizeRoute(pathname: string): string {
  return pathname
    .replace(/\/\d+(?=\/|$)/g, "/:id")
    .replace(/\/[0-9a-f-]{36}(?=\/|$)/gi, "/:uuid"); // any UUID-shaped segment
}

interface StoreShape {
  metricsStart?: number;
}

export const metricsPlugin = new Elysia({ name: "metrics" })
  .state("metricsStart", 0)
  .onRequest(({ store }) => {
    (store as StoreShape).metricsStart = performance.now();
  })
  .onAfterResponse(({ request, set, store }) => {
    const start = (store as StoreShape).metricsStart ?? 0;
    if (!start) return;
    const durationSec = (performance.now() - start) / 1000;
    const pathname = new URL(request.url).pathname;
    const route = normalizeRoute(pathname);
    const method = request.method;
    const status = String(set.status ?? 200);
    httpRequestsTotal.labels(method, route, status).inc();
    httpDurationSeconds.labels(method, route, status).observe(durationSec);
  })
  // Expose /metrics endpoint — public, no auth (Prometheus scrape ภายใน docker network)
  .get("/metrics", async ({ set }) => {
    set.headers["Content-Type"] = registry.contentType;
    return await registry.metrics();
  });

// ── Pole gauges updater — periodic poll DB เพื่ออัปเดต gauges ──
// แยกจาก request path เพราะเป็น "domain state" ไม่ผูกกับ request
// เรียกจาก src/index.ts ตอน startup
import { prisma } from "@/plugins/prisma";

let pollHandle: NodeJS.Timeout | null = null;

async function refreshPoleGauges(): Promise<void> {
  try {
    const [total, online] = await Promise.all([
      prisma.pole.count({ where: { deletedAt: null } }),
      prisma.pole.count({ where: { deletedAt: null, poleStatus: "online" } }),
    ]);
    polesTotalGauge.set(total);
    polesOnlineGauge.set(online);
  } catch {
    // silently skip — ไม่อยาก crash metric updater
  }
}

export function startMetricsPollers(intervalMs: number = 30_000): void {
  if (pollHandle) return;
  void refreshPoleGauges(); // first tick immediately
  pollHandle = setInterval(() => void refreshPoleGauges(), intervalMs);
}

export function stopMetricsPollers(): void {
  if (pollHandle) {
    clearInterval(pollHandle);
    pollHandle = null;
  }
}
