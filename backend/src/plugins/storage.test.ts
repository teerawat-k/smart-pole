import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { sanitizeFilename, buildStoragePath, ensureDir, fileExists, deleteFile } from "./storage";
import { writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

describe("sanitizeFilename", () => {
  test("strip path traversal", () => {
    expect(sanitizeFilename("../etc/passwd")).toBe("__etc_passwd");
  });

  test("strip backslash", () => {
    expect(sanitizeFilename("a\\b\\c.txt")).toBe("a_b_c.txt");
  });

  test("non-ascii → _", () => {
    // ภาษาไทย 5 ตัว → "_____.jpg" (ไม่นับสระ/วรรณยุกต์เป็นตัวอักษรแยก)
    expect(sanitizeFilename("ทดสอบ.jpg")).toBe("_____.jpg");
  });

  test("preserve ascii word + dot + dash", () => {
    expect(sanitizeFilename("my-file_v2.tar.gz")).toBe("my-file_v2.tar.gz");
  });

  test("limit 200 chars", () => {
    const long = "a".repeat(300);
    expect(sanitizeFilename(long).length).toBe(200);
  });
});

describe("buildStoragePath", () => {
  test("ใช้ {year}/{month}/{id}-{ts}-{safe} pattern", () => {
    const p = buildStoragePath("avatar", 5, "user-photo.jpg");
    expect(p).toMatch(/avatar\/\d{4}\/\d{2}\/5-\d+-user-photo\.jpg$/);
  });

  test("sanitize filename ก่อนใช้", () => {
    const p = buildStoragePath("doc", 1, "../../bad.pdf");
    expect(p).not.toContain("..");
    expect(p).toMatch(/_+bad\.pdf$/);
  });
});

describe("file system helpers", () => {
  const tmpRoot = path.join(tmpdir(), `smart-pole-storage-test-${Date.now()}`);
  const targetFile = path.join(tmpRoot, "sub", "deep", "test.txt");

  beforeAll(async () => {
    await ensureDir(targetFile);
    await writeFile(targetFile, "hello");
  });

  afterAll(async () => {
    await rm(tmpRoot, { recursive: true, force: true });
  });

  test("ensureDir สร้าง parent dir แบบ recursive", async () => {
    expect(await fileExists(targetFile)).toBe(true);
  });

  test("fileExists ส่งคืน false เมื่อไฟล์ไม่มี", async () => {
    expect(await fileExists(path.join(tmpRoot, "nope.txt"))).toBe(false);
  });

  test("deleteFile ลบไฟล์ได้", async () => {
    const f = path.join(tmpRoot, "to-delete.txt");
    await writeFile(f, "x");
    expect(await fileExists(f)).toBe(true);
    expect(await deleteFile(f)).toBe(true);
    expect(await fileExists(f)).toBe(false);
  });

  test("deleteFile ส่งคืน false เมื่อไฟล์ไม่มี (ไม่ throw)", async () => {
    expect(await deleteFile(path.join(tmpRoot, "ghost.txt"))).toBe(false);
  });
});
