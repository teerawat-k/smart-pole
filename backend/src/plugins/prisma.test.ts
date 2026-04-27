import { describe, test, expect } from "bun:test";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

describe("prisma plugin", () => {
  describe("Decimal.toJSON override", () => {
    test("ส่งคืนค่าเป็น number เมื่อ JSON.stringify Decimal", () => {
      const d = new Prisma.Decimal("12.34");
      const json = JSON.stringify({ amount: d });
      expect(json).toBe('{"amount":12.34}');
    });

    test("ส่งคืนค่าเป็น number เมื่อจำนวนเต็ม", () => {
      const d = new Prisma.Decimal("100");
      expect(JSON.parse(JSON.stringify(d))).toBe(100);
    });

    test("รักษา precision 2 ทศนิยม", () => {
      const d = new Prisma.Decimal("0.10");
      expect(JSON.parse(JSON.stringify(d))).toBe(0.1);
    });

    test("รองรับค่าติดลบ", () => {
      const d = new Prisma.Decimal("-99.99");
      expect(JSON.parse(JSON.stringify(d))).toBe(-99.99);
    });
  });

  describe("singleton", () => {
    test("ส่งคืน instance เดียวกันเมื่อ import ซ้ำ", async () => {
      const mod1 = await import("./prisma");
      const mod2 = await import("./prisma");
      expect(mod1.prisma).toBe(mod2.prisma);
    });

    test("เก็บ instance ใน globalThis เมื่อไม่ใช่ production", () => {
      // ใน test mode (NODE_ENV=test) ต้อง cache ผ่าน globalThis
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- access global cache
      const cached = (globalThis as any).__prisma;
      expect(cached).toBeDefined();
      expect(cached).toBe(prisma);
    });
  });
});
