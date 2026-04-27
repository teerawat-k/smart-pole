import { describe, test, expect } from "bun:test";
import { Elysia } from "elysia";
import { requestIdPlugin } from "./request-id";

function createTestApp() {
  return new Elysia()
    .use(requestIdPlugin)
    .get("/echo", ({ store }) => ({ requestId: store.requestId }))
    .get("/throw", () => {
      throw new Error("boom");
    });
}

describe("requestIdPlugin", () => {
  test("สร้าง UUID ใหม่เมื่อไม่มี header เข้ามา", async () => {
    const app = createTestApp();
    const res = await app.handle(new Request("http://localhost/echo"));
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
  });

  test("ใช้ x-request-id จาก header เมื่อรูปแบบถูกต้อง", async () => {
    const app = createTestApp();
    const res = await app.handle(
      new Request("http://localhost/echo", { headers: { "x-request-id": "valid-rid-123456" } }),
    );
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).toBe("valid-rid-123456");
    expect(res.headers.get("x-request-id")).toBe("valid-rid-123456");
  });

  test("ปฏิเสธ x-request-id รูปแบบไม่ถูกและ generate ใหม่", async () => {
    const app = createTestApp();
    const res = await app.handle(
      new Request("http://localhost/echo", { headers: { "x-request-id": "x" } }), // < 8 chars
    );
    const body = (await res.json()) as { requestId: string };
    expect(body.requestId).not.toBe("x");
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("แต่ละ request มี requestId ต่างกัน", async () => {
    const app = createTestApp();
    const r1 = await app.handle(new Request("http://localhost/echo"));
    const r2 = await app.handle(new Request("http://localhost/echo"));
    const b1 = (await r1.json()) as { requestId: string };
    const b2 = (await r2.json()) as { requestId: string };
    expect(b1.requestId).not.toBe(b2.requestId);
  });
});
