import { prisma } from "@/plugins/prisma";
import * as argon2 from "argon2";

const SEED_MQTT_PASSWORD = "dev-mqtt-password";

const INSTALL_PLACES = [
  "ทางเข้าอาคาร A",
  "ลานจอดรถ B",
  "หน้าประตู C",
  "ถนนสายหลัก D",
  "สวนหย่อม E",
  "ทางเดินหลัง F",
  "ลานกิจกรรม G",
  "ที่จอดรถ H",
  "ทางออกฉุกเฉิน I",
  "ริมรั้วด้านเหนือ J",
];

export async function seedPoles(): Promise<void> {
  // username/poleName ไม่ใช่ @unique แล้ว (partial unique) → findFirst + create guard แทน findUnique/upsert
  const admin = await prisma.user.findFirst({ where: { username: "admin", deletedAt: null }, select: { id: true } });
  if (!admin) throw new Error("admin user missing — run seedUsers first");

  const passwordHash = await argon2.hash(SEED_MQTT_PASSWORD);

  for (let i = 1; i <= 10; i++) {
    const poleName = `pole-${String(i).padStart(2, "0")}`;
    const existing = await prisma.pole.findFirst({ where: { poleName, deletedAt: null }, select: { id: true } });
    if (existing) {
      console.log(`↻ Pole already exists: ${poleName} — skip`);
      continue;
    }
    await prisma.pole.create({
      data: {
        poleName,
        installPlace: INSTALL_PLACES[i - 1],
        mqttUsername: poleName,
        mqttPasswordHash: passwordHash,
        hasCamera: i % 3 === 1,
        hasPm25Sensor: true,
        hasTempHumidity: true,
        hasLed: i % 2 === 1,
        createdBy: admin.id,
      },
    });
    console.log(`✅ Pole created: ${poleName} @ ${INSTALL_PLACES[i - 1]}`);
  }
}
