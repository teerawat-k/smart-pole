import { prisma } from "@/plugins/prisma";

interface SensorTypeSeed {
  key: string;
  displayName: string;
  unit?: string;
  tableName: string;
  chartType?: string;
  chartColor?: string;
  retentionDays?: number;
}

const SENSOR_TYPES: SensorTypeSeed[] = [
  { key: "pm25", displayName: "ฝุ่น PM2.5", unit: "µg/m³", tableName: "sensor_pm25", chartType: "line", chartColor: "#F59E0B" },
  { key: "temperature", displayName: "อุณหภูมิ", unit: "°C", tableName: "sensor_temperature", chartType: "line", chartColor: "#EF4444" },
  { key: "humidity", displayName: "ความชื้น", unit: "%RH", tableName: "sensor_humidity", chartType: "line", chartColor: "#22C55E" },
  { key: "heartbeat_signal", displayName: "สัญญาณ", unit: "dBm", tableName: "sensor_heartbeat_signal", chartType: "line", chartColor: "#1565C0" },
];

const SEED_USER_ID = 0;

export async function seedSensorTypes(): Promise<void> {
  for (const s of SENSOR_TYPES) {
    await prisma.sensorType.upsert({
      where: { key: s.key },
      update: {
        displayName: s.displayName,
        unit: s.unit,
        tableName: s.tableName,
        chartType: s.chartType,
        chartColor: s.chartColor,
      },
      create: { ...s, createdBy: SEED_USER_ID, retentionDays: s.retentionDays ?? 365 },
    });
  }
  console.log(`✅ Seeded ${SENSOR_TYPES.length} sensor types`);
}
