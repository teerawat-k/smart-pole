// ── Integration test: MQTT handler → DB ─────────────────
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { prisma } from "@/plugins/prisma";
import { handleSensorMessage } from "./handlers/handle-sensor";
import { hashPassword } from "@/common/utils/password";

const TEST_POLE_NAME = `mqtt-itest-${Date.now()}`;
let testPoleId: number;
let adminId: number;

beforeAll(async () => {
  const admin = await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } });
  if (!admin) throw new Error("admin user missing — run seed first");
  adminId = admin.id;

  const pwHash = await hashPassword("test-pw");
  const pole = await prisma.pole.create({
    data: {
      poleName: TEST_POLE_NAME,
      installPlace: "Integration test pole",
      mqttUsername: `mqtt-itest-${Date.now()}`,
      mqttPasswordHash: pwHash,
      hasCamera: true,
      hasPm25Sensor: true,
      hasTempHumidity: true,
      createdBy: adminId,
    },
  });
  testPoleId = pole.id;
});

afterAll(async () => {
  await prisma.sensorReading.deleteMany({ where: { poleId: testPoleId } });
  await prisma.pole.delete({ where: { id: testPoleId } });
});

beforeEach(async () => {
  await prisma.sensorReading.deleteMany({ where: { poleId: testPoleId } });
  await prisma.pole.update({
    where: { id: testPoleId },
    data: {
      latestSeq: null,
      latestPm25: null,
      latestTemperature: null,
      latestHumidity: null,
      latestReadingAt: null,
      lastSeenAt: null,
      poleStatus: "unknown",
    },
  });
});

describe("MQTT integration — sensor handler", () => {
  test("ส่ง sensor packet → บันทึก SensorReading + อัปเดตค่าล่าสุดใน Pole", async () => {
    const now = Date.now();
    await handleSensorMessage(TEST_POLE_NAME, {
      timestamp: now,
      seq: 1,
      pm25: 35.2,
      temperature: 28.5,
      humidity: 65.0,
    });

    const reading = await prisma.sensorReading.findFirst({ where: { poleId: testPoleId } });
    expect(reading?.pm25?.toString()).toBe("35.2");
    expect(reading?.temperature?.toString()).toBe("28.5");
    expect(reading?.humidity?.toString()).toBe("65");

    const pole = await prisma.pole.findUnique({ where: { id: testPoleId } });
    expect(pole?.latestPm25?.toString()).toBe("35.2");
    expect(pole?.latestTemperature?.toString()).toBe("28.5");
    expect(pole?.latestSeq).toBe(1n);
    expect(pole?.poleStatus).toBe("online");
    expect(pole?.lastSeenAt).toBe(BigInt(now));
  });

  test("ปฏิเสธ payload ที่ค่า humidity เกินช่วง", async () => {
    await handleSensorMessage(TEST_POLE_NAME, {
      timestamp: Date.now(),
      seq: 3,
      humidity: 150,
    });
    const count = await prisma.sensorReading.count({ where: { poleId: testPoleId } });
    expect(count).toBe(0);
  });

  test("ส่ง packet ใหม่ → ค่าล่าสุดใน Pole ถูก overwrite, history เก็บทั้ง 2 row", async () => {
    const t1 = Date.now() - 1000;
    const t2 = Date.now();
    await handleSensorMessage(TEST_POLE_NAME, {
      timestamp: t1,
      seq: 10,
      temperature: 25,
    });
    await handleSensorMessage(TEST_POLE_NAME, {
      timestamp: t2,
      seq: 11,
      temperature: 30,
    });

    const readings = await prisma.sensorReading.count({ where: { poleId: testPoleId } });
    expect(readings).toBe(2);

    const pole = await prisma.pole.findUnique({ where: { id: testPoleId } });
    expect(pole?.latestTemperature?.toString()).toBe("30");
    expect(pole?.latestSeq).toBe(11n);
  });

  test("ปฏิเสธ payload ที่ poleName หาในฐานข้อมูลไม่เจอ", async () => {
    await handleSensorMessage("non-existent-pole", {
      timestamp: Date.now(),
      seq: 99,
      pm25: 10,
    });
    const count = await prisma.sensorReading.count({ where: { poleId: testPoleId } });
    expect(count).toBe(0);
  });
});
