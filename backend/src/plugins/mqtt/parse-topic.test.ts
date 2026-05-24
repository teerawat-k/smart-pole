import { describe, test, expect } from "bun:test";
import { parseTopic } from "./parse-topic";

describe("parseTopic", () => {
  test("parse smartpole/<poleName>/sensor", () => {
    expect(parseTopic("smartpole/pole-01/sensor")).toEqual({
      poleName:    "pole-01",
      messageType: "sensor",
    });
    expect(parseTopic("smartpole/abc_123/sensor")).toEqual({
      poleName:    "abc_123",
      messageType: "sensor",
    });
  });

  test("ปฏิเสธ topic ที่ไม่มี smartpole prefix", () => {
    expect(parseTopic("other/pole-01/sensor")).toBeNull();
  });

  test("ปฏิเสธ messageType ที่ไม่รู้จัก", () => {
    expect(parseTopic("smartpole/pole-01/event")).toBeNull();
    expect(parseTopic("smartpole/pole-01/heartbeat")).toBeNull();
    expect(parseTopic("smartpole/pole-01/cmd")).toBeNull();
  });

  test("ปฏิเสธ topic ที่จำนวน segment ไม่ใช่ 3", () => {
    expect(parseTopic("smartpole")).toBeNull();
    expect(parseTopic("smartpole/sensor")).toBeNull();
    expect(parseTopic("smartpole/pole-01/sensor/extra")).toBeNull();
  });

  test("ปฏิเสธ poleName ที่ผิด format", () => {
    expect(parseTopic("smartpole//sensor")).toBeNull();
    expect(parseTopic("smartpole/pole 01/sensor")).toBeNull();
    expect(parseTopic("smartpole/pole.01/sensor")).toBeNull();
    expect(parseTopic("smartpole/pole/01/sensor")).toBeNull();
    const tooLong = "a".repeat(65);
    expect(parseTopic(`smartpole/${tooLong}/sensor`)).toBeNull();
  });
});
