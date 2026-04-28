import { describe, test, expect } from "bun:test";
import { parseTopic } from "./parse-topic";

describe("parseTopic", () => {
  test("parse smartpole/sensor", () => {
    expect(parseTopic("smartpole/sensor")).toEqual({ messageType: "sensor" });
  });

  test("ปฏิเสธ topic ที่ไม่มี smartpole prefix", () => {
    expect(parseTopic("other/sensor")).toBeNull();
  });

  test("ปฏิเสธ messageType ที่ไม่รู้จัก", () => {
    expect(parseTopic("smartpole/event")).toBeNull();
    expect(parseTopic("smartpole/heartbeat")).toBeNull();
  });

  test("ปฏิเสธ topic ที่จำนวน segment ไม่ใช่ 2", () => {
    expect(parseTopic("smartpole")).toBeNull();
    expect(parseTopic("smartpole/pole-01/sensor")).toBeNull();
  });
});
