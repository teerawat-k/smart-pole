import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Prisma } from "@prisma/client";

// ควบคุมค่าที่ repo คืน ต่อ test
let nextReading: {
  latestSeq: bigint | null;
  latestPm25: Prisma.Decimal | null;
  latestTemperature: Prisma.Decimal | null;
  latestHumidity: Prisma.Decimal | null;
  latestReadingAt: bigint | null;
} | null = null;

mock.module("./sensor-reading.repository", () => ({
  sensorReadingRepository: { findLatest: async () => nextReading },
}));

const { sensorReadingService } = await import("./sensor-reading.service");

function readingAgedMs(ageMs: number) {
  return {
    latestSeq: 16n,
    latestPm25: new Prisma.Decimal(13),
    latestTemperature: new Prisma.Decimal(28),
    latestHumidity: new Prisma.Decimal(87.6),
    latestReadingAt: BigInt(Date.now() - ageMs),
  };
}

describe("sensorReadingService.findLatest", () => {
  beforeEach(() => { nextReading = null; });

  test("ส่งคืนค่า metric เมื่อข้อมูลสด (อายุ < 4 นาที)", async () => {
    nextReading = readingAgedMs(30_000); // 30 วินาที
    const r = await sensorReadingService.findLatest(1);
    expect(r.sensorFresh).toBe(true);
    expect(Number(r.latestPm25)).toBe(13);
    expect(Number(r.latestTemperature)).toBe(28);
    expect(Number(r.latestHumidity)).toBe(87.6);
  });

  test("ส่งคืน metric เป็น null เมื่อข้อมูลเก่าเกิน 4 นาที (sensor ไม่ทำงาน)", async () => {
    nextReading = readingAgedMs(5 * 60 * 1000); // 5 นาที
    const r = await sensorReadingService.findLatest(1);
    expect(r.sensorFresh).toBe(false);
    expect(r.latestPm25).toBeNull();
    expect(r.latestTemperature).toBeNull();
    expect(r.latestHumidity).toBeNull();
    expect(r.latestReadingAt).not.toBeNull(); // ยังคืนเวลาล่าสุด — โชว์ "ข้อมูลล่าสุดเมื่อ..."
  });

  test("ส่งคืนค่าที่ขอบเขต 4 นาทีพอดี ยังถือว่าสด", async () => {
    nextReading = readingAgedMs(4 * 60 * 1000 - 100); // เกือบ 4 นาที
    const r = await sensorReadingService.findLatest(1);
    expect(r.sensorFresh).toBe(true);
    expect(r.latestPm25).not.toBeNull();
  });

  test("ส่งคืน null ทั้งหมดเมื่อไม่เคยมีข้อมูล", async () => {
    nextReading = null;
    const r = await sensorReadingService.findLatest(1);
    expect(r.sensorFresh).toBe(false);
    expect(r.latestReadingAt).toBeNull();
    expect(r.latestPm25).toBeNull();
  });
});
