// ── Sensor handler registry ─────────────────────────────────
// แต่ละ sensor type ลงทะเบียนผ่าน registerSensorHandler ตอน module load
// MQTT handler จะ dispatch ตาม `readings.{key}` → handler ของ key นั้น
import type { ZodSchema } from "zod";
import type { PrismaTx } from "@/common/utils/prisma-tx";

export interface SensorHandler<TPayload = unknown> {
  /** sensor type key (ตรงกับ readings key ใน MQTT payload + SensorType.key) */
  key: string;
  /** Zod schema สำหรับ validate payload ของ sensor นั้น */
  schema: ZodSchema<TPayload>;
  /** เขียน data ลง hypertable / table — caller ส่ง time + seq + payload */
  write: (input: { poleId: number; time: Date; seq: bigint; data: TPayload; rawJson?: unknown }, tx?: PrismaTx) => Promise<void>;
}

const handlers = new Map<string, SensorHandler>();

export function registerSensorHandler<T>(handler: SensorHandler<T>): void {
  if (handlers.has(handler.key)) {
    throw new Error(`Sensor handler "${handler.key}" already registered`);
  }
  handlers.set(handler.key, handler as SensorHandler);
}

export function getSensorHandler(key: string): SensorHandler | undefined {
  return handlers.get(key);
}

export function listSensorKeys(): string[] {
  return Array.from(handlers.keys());
}

/** TEST ONLY — clear registry (ใช้ใน test setup) */
export function _clearSensorHandlers(): void {
  handlers.clear();
}
