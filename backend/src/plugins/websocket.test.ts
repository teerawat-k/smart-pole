import { describe, test, expect, beforeEach } from "bun:test";
import {
  addConnection,
  removeConnection,
  sendInvalidate,
  sendNotification,
  broadcastToAll,
  broadcastPoleStatus,
  getConnectedUserIds,
  getConnectionCount,
} from "./websocket";

interface FakeWs {
  send: (msg: string) => void;
  close: () => void;
  messages: string[];
}

function makeWs(): FakeWs {
  const messages: string[] = [];
  return {
    send: (msg) => messages.push(msg),
    close: () => undefined,
    messages,
  };
}

beforeEach(() => {
  // clear cache (in-memory map ไม่มี reset api — ลบทุก connection ผ่าน getConnectedUserIds)
  for (const uid of getConnectedUserIds()) {
    // ไม่มี removeAllByUser — ใช้ remove ทีละ ws ไม่ได้เพราะไม่มี ref
    // วิธี clear: ใช้ broadcast ปลอม — แต่จริงๆ test เริ่มจากศูนย์เพราะ map fresh ทุก test (ไม่ใช่ — module-level state shared)
    // workaround: skip — แต่ละ test ใช้ userId ต่างกัน
    void uid;
  }
});

describe("websocket registry", () => {
  test("addConnection + getConnectionCount", () => {
    const before = getConnectionCount();
    const ws = makeWs();
    addConnection(1001, ws);
    expect(getConnectionCount()).toBe(before + 1);
    expect(getConnectedUserIds()).toContain(1001);
    removeConnection(1001, ws);
  });

  test("รับ multiple connections per user", () => {
    const ws1 = makeWs();
    const ws2 = makeWs();
    addConnection(2001, ws1);
    addConnection(2001, ws2);
    sendInvalidate([2001], "pole");
    expect(ws1.messages).toHaveLength(1);
    expect(ws2.messages).toHaveLength(1);
    removeConnection(2001, ws1);
    removeConnection(2001, ws2);
  });

  test("removeConnection คืนค่า map clean เมื่อ user ไม่มี ws เหลือ", () => {
    const ws = makeWs();
    addConnection(3001, ws);
    expect(getConnectedUserIds()).toContain(3001);
    removeConnection(3001, ws);
    expect(getConnectedUserIds()).not.toContain(3001);
  });
});

describe("broadcast functions", () => {
  test("sendInvalidate ส่ง message ที่ type=invalidate", () => {
    const ws = makeWs();
    addConnection(4001, ws);
    sendInvalidate([4001], "pole");
    expect(ws.messages).toHaveLength(1);
    const parsed = JSON.parse(ws.messages[0]!) as { type: string; entity: string };
    expect(parsed.type).toBe("invalidate");
    expect(parsed.entity).toBe("pole");
    removeConnection(4001, ws);
  });

  test("sendNotification ส่ง type=notification + payload", () => {
    const ws = makeWs();
    addConnection(5001, ws);
    sendNotification([5001], { title: "เตือน", message: "PM2.5 สูง", severity: "warning" });
    const parsed = JSON.parse(ws.messages[0]!) as { type: string; payload: { title: string } };
    expect(parsed.type).toBe("notification");
    expect(parsed.payload.title).toBe("เตือน");
    removeConnection(5001, ws);
  });

  test("broadcastToAll ส่งทุก user ที่ online", () => {
    const wsA = makeWs();
    const wsB = makeWs();
    addConnection(6001, wsA);
    addConnection(6002, wsB);
    broadcastToAll({ type: "test" });
    expect(wsA.messages).toHaveLength(1);
    expect(wsB.messages).toHaveLength(1);
    removeConnection(6001, wsA);
    removeConnection(6002, wsB);
  });

  test("broadcastPoleStatus ส่ง pole-status-changed", () => {
    const ws = makeWs();
    addConnection(7001, ws);
    broadcastPoleStatus("pole-001", "online", new Date("2026-04-27T10:00:00Z"));
    const parsed = JSON.parse(ws.messages[0]!) as { type: string; payload: { poleName: string; status: string } };
    expect(parsed.type).toBe("pole-status-changed");
    expect(parsed.payload.poleName).toBe("pole-001");
    expect(parsed.payload.status).toBe("online");
    removeConnection(7001, ws);
  });
});
