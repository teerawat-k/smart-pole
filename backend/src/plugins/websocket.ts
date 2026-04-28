// ── WebSocket connection registry (in-memory) ─────────────
// Push-only — ห้าม store business state ใน WS connection
// Future: scale-out → Redis pub/sub
import { Elysia, t } from "elysia";
import { jwtAccessPlugin } from "./jwt";
import { logger } from "./logger";

interface WsLike {
  send: (msg: string) => void;
  close: (code?: number, reason?: string) => void;
}

const connections = new Map<number, Set<WsLike>>();

// ── Register / unregister ─────────────────────────────────
export function addConnection(userId: number, ws: WsLike): void {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId)!.add(ws);
}

export function removeConnection(userId: number, ws: WsLike): void {
  connections.get(userId)?.delete(ws);
  if (connections.get(userId)?.size === 0) connections.delete(userId);
}

export function getConnectedUserIds(): number[] {
  return Array.from(connections.keys());
}

export function getConnectionCount(): number {
  let total = 0;
  for (const set of connections.values()) total += set.size;
  return total;
}

// ── Broadcast atoms ───────────────────────────────────────
export function sendInvalidate(userIds: number[], entity: string, payload?: unknown): void {
  const msg = JSON.stringify({ type: "invalidate", entity, payload });
  for (const uid of userIds) {
    connections.get(uid)?.forEach((ws) => safeSend(ws, msg));
  }
}

export function sendNotification(userIds: number[], notification: { title: string; message: string; severity?: string; refType?: string; refId?: number }): void {
  const msg = JSON.stringify({ type: "notification", payload: notification });
  for (const uid of userIds) {
    connections.get(uid)?.forEach((ws) => safeSend(ws, msg));
  }
}

export function broadcastToAll(message: unknown): void {
  const msg = JSON.stringify(message);
  for (const set of connections.values()) {
    set.forEach((ws) => safeSend(ws, msg));
  }
}

export function broadcastPoleStatus(poleName: string, status: string, lastSeenAt?: bigint): void {
  broadcastToAll({
    type: "pole-status-changed",
    payload: { poleName, status, lastSeenAt },
  });
}

export function broadcastSensorReading(poleName: string, sensorKey: string, data: Record<string, unknown>): void {
  broadcastToAll({
    type: "sensor-reading",
    payload: { poleName, sensorKey, data },
  });
}

function safeSend(ws: WsLike, msg: string): void {
  try {
    ws.send(msg);
  } catch (err) {
    logger.warn({ err }, "WS send failed");
  }
}

// ── Elysia WS plugin ──────────────────────────────────────
// connect: ws://.../ws?token=<jwt>
// JWT verify ตอน open → reject 4001 ถ้า invalid
export const websocketPlugin = new Elysia({ name: "websocket" })
  .use(jwtAccessPlugin)
  .ws("/ws", {
    query: t.Object({ token: t.String() }),
    async open(ws) {
      const payload = await ws.data.jwt.verify(ws.data.query.token);
      if (!payload || typeof payload === "boolean") {
        ws.close(4001, "Unauthorized");
        return;
      }
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId) || userId <= 0) {
        ws.close(4001, "Invalid token");
        return;
      }
      // เก็บ userId ใน ws.data (Elysia state)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Elysia ws.data extends ที่ runtime
      (ws.data as any).userId = userId;
      addConnection(userId, ws);
      logger.info({ userId, connections: getConnectionCount() }, "WS connected");
    },
    close(ws) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ดึง userId จาก runtime data
      const userId = (ws.data as any).userId as number | undefined;
      if (typeof userId === "number") {
        removeConnection(userId, ws);
        logger.info({ userId, connections: getConnectionCount() }, "WS disconnected");
      }
    },
    message(ws, message) {
      if (message === "ping") ws.send("pong");
    },
    body: t.String(),
  });
