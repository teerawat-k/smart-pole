import { describe, test, expect } from "vitest";
import { cn } from "./utils";

describe("lib/utils.cn", () => {
  test("รวม class strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  test("ผสาน Tailwind conflicting classes ผ่าน twMerge (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  test("รับ conditional object syntax (clsx)", () => {
    expect(cn("a", { b: true, c: false })).toBe("a b");
  });

  test("กรอง falsy values ออก", () => {
    expect(cn("a", null, undefined, false, "b")).toBe("a b");
  });

  test("รับ array ของ classes", () => {
    expect(cn(["a", "b"], "c")).toBe("a b c");
  });

  test("ส่งคืน empty string เมื่อไม่มี input", () => {
    expect(cn()).toBe("");
  });
});
