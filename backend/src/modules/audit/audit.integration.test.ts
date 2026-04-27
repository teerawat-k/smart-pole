import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { prisma } from "@/plugins/prisma";
import { auditService } from "./audit.service";
import { AuditAction } from "./audit.constants";

const TEST_PREFIX = `audit-itest-${Date.now()}`;

describe("audit integration (real DB)", () => {
  beforeAll(async () => {
    // cleanup ก่อน — กัน data ค้างจาก test ที่ crash
    await prisma.auditLog.deleteMany({ where: { module: { startsWith: TEST_PREFIX } } });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { module: { startsWith: TEST_PREFIX } } });
  });

  test("เขียน audit log ลง DB จริงและ query กลับมาได้", async () => {
    auditService.log({
      userId: 999,
      action: AuditAction.CREATE,
      module: `${TEST_PREFIX}-pole`,
      targetId: 1,
      payload: { name: "Test pole" },
    });
    // รอ async write commit
    await new Promise((r) => setTimeout(r, 200));

    const logs = await prisma.auditLog.findMany({ where: { module: `${TEST_PREFIX}-pole` } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      userId: 999,
      action: "CREATE",
      module: `${TEST_PREFIX}-pole`,
      targetId: 1,
    });
    expect(logs[0]?.payload).toEqual({ name: "Test pole" });
  });

  test("เขียน audit ได้แม้ไม่ส่ง payload", async () => {
    auditService.log({
      userId: 999,
      action: AuditAction.DELETE,
      module: `${TEST_PREFIX}-no-payload`,
      targetId: 2,
    });
    await new Promise((r) => setTimeout(r, 200));

    const logs = await prisma.auditLog.findMany({ where: { module: `${TEST_PREFIX}-no-payload` } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.payload).toBeNull();
  });
});
