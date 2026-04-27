// ── Sensor archive facade — generic API ────────────────────
// frontend ใช้ endpoint นี้ — ระบบ dispatch ตาม sensor key registry
import { sensorPm25Service } from "@/modules/sensor-pm25";
import { sensorTemperatureService } from "@/modules/sensor-temperature";
import { sensorHumidityService } from "@/modules/sensor-humidity";
import { sensorHeartbeatSignalService } from "@/modules/sensor-heartbeat-signal";
import { prisma } from "@/plugins/prisma";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

interface HistoryParams {
  poleId: number;
  from: Date;
  to: Date;
  limit?: number;
}

export const sensorArchiveService = {
  async listSensorTypes() {
    return prisma.sensorType.findMany({
      where: { deletedAt: null, isEnabled: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        key: true,
        displayName: true,
        unit: true,
        chartType: true,
        chartColor: true,
      },
    });
  },

  async latestForPole(poleId: number) {
    const pole = await prisma.pole.findFirst({ where: { id: poleId, deletedAt: null } });
    if (!pole) throw new NotFoundError(ErrorCode.POLE_NOT_FOUND, "ไม่พบเสาที่ระบุ");

    const [pm25, temperature, humidity] = await Promise.all([
      sensorPm25Service.findLatest(poleId),
      sensorTemperatureService.findLatest(poleId),
      sensorHumidityService.findLatest(poleId),
    ]);
    return { pm25, temperature, humidity };
  },

  async history(sensorKey: string, params: HistoryParams) {
    switch (sensorKey) {
      case "pm25":
        return sensorPm25Service.findHistory(params);
      case "temperature":
        return sensorTemperatureService.findHistory(params);
      case "humidity":
        return sensorHumidityService.findHistory(params);
      case "heartbeat_signal":
        return sensorHeartbeatSignalService.findHistory(params);
      default:
        throw new NotFoundError(ErrorCode.SENSOR_TYPE_NOT_FOUND, `ไม่พบ sensor type "${sensorKey}"`);
    }
  },
};
