import { describe, test, expect } from "bun:test";
import { parseTopic } from "./parse-topic";

describe("parseTopic", () => {
  test("parse smartpole/pole-001/sensor", () => {
    expect(parseTopic("smartpole/pole-001/sensor")).toEqual({
      poleName: "pole-001",
      messageType: "sensor",
    });
  });

  test("parse smartpole/pole-001/heartbeat", () => {
    expect(parseTopic("smartpole/pole-001/heartbeat")).toEqual({
      poleName: "pole-001",
      messageType: "heartbeat",
    });
  });

  test("parse smartpole/pole-001/command/ack — รวม subpath", () => {
    expect(parseTopic("smartpole/pole-001/command/ack")).toEqual({
      poleName: "pole-001",
      messageType: "command/ack",
    });
  });

  test("ปฏิเสธ topic ที่ไม่มี smartpole prefix", () => {
    expect(parseTopic("other/pole-001/sensor")).toBeNull();
  });

  test("ปฏิเสธ topic สั้นกว่า 3 segments", () => {
    expect(parseTopic("smartpole/pole-001")).toBeNull();
    expect(parseTopic("smartpole")).toBeNull();
  });

  test("ปฏิเสธ topic ที่ poleName ว่าง", () => {
    expect(parseTopic("smartpole//sensor")).toBeNull();
  });
});
