import { describe, test, expect, mock, beforeEach } from "bun:test";

const published: Array<{ poleName: string; command: { action: string; ttl?: number } }> = [];
const audited: Array<{ action: string; targetId: number; payload: unknown }> = [];

mock.module("../pole.repository", () => ({
  poleRepository: {
    findById: async (id: number) =>
      id === 1 ? { id: 1, poleName: "pole-01", poleStatus: "online" } : null,
  },
}));

mock.module("@/plugins/mqtt", () => ({
  publishPoleCommand: async (poleName: string, command: { action: string; ttl?: number }) => {
    published.push({ poleName, command });
  },
}));

mock.module("@/modules/audit", () => ({
  auditService: { log: (d: { action: string; targetId: number; payload: unknown }) => audited.push(d) },
  AuditAction: { VPN_OPEN: "VPN_OPEN", VPN_CLOSE: "VPN_CLOSE" },
}));

const { triggerVpn } = await import("./trigger-vpn");

describe("triggerVpn", () => {
  beforeEach(() => {
    published.length = 0;
    audited.length = 0;
  });

  test("ส่งคำสั่ง vpn-open ไป topic ของเสาด้วย ttl ที่ระบุ", async () => {
    const result = await triggerVpn(1, { action: "open", ttl: 600 }, 42);
    expect(published).toHaveLength(1);
    expect(published[0]).toEqual({ poleName: "pole-01", command: { action: "vpn-open", ttl: 600 } });
    expect(result).toEqual({ poleName: "pole-01", action: "open", ttl: 600 });
  });

  test("ใช้ ttl ค่าเริ่มต้น 1800 เมื่อไม่ระบุ", async () => {
    await triggerVpn(1, { action: "open" }, 42);
    expect(published[0].command).toEqual({ action: "vpn-open", ttl: 1800 });
  });

  test("ส่งคำสั่ง vpn-close โดยไม่มี ttl", async () => {
    await triggerVpn(1, { action: "close" }, 42);
    expect(published[0].command).toEqual({ action: "vpn-close", ttl: undefined });
  });

  test("บันทึก audit VPN_OPEN พร้อม payload", async () => {
    await triggerVpn(1, { action: "open", ttl: 300 }, 42);
    expect(audited).toHaveLength(1);
    expect(audited[0].action).toBe("VPN_OPEN");
    expect(audited[0].targetId).toBe(1);
    expect(audited[0].payload).toEqual({ poleName: "pole-01", action: "open", ttl: 300 });
  });

  test("บันทึก audit VPN_CLOSE เมื่อปิด", async () => {
    await triggerVpn(1, { action: "close" }, 42);
    expect(audited[0].action).toBe("VPN_CLOSE");
  });

  test("โยน NotFoundError เมื่อไม่พบเสา", async () => {
    await expect(triggerVpn(999, { action: "open" }, 42)).rejects.toThrow("ไม่พบเสาที่ระบุ");
  });
});
