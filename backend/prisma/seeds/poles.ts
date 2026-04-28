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
  const admin = await prisma.user.findUnique({ where: { username: "admin" }, select: { id: true } });
  if (!admin) throw new Error("admin user missing — run seedUsers first");

  const passwordHash = await argon2.hash(SEED_MQTT_PASSWORD);

  for (let i = 1; i <= 10; i++) {
    const poleName = `pole-${String(i).padStart(2, "0")}`;
    await prisma.pole.upsert({
      where: { poleName },
      update: {},
      create: {
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
    console.log(`✅ Pole upserted: ${poleName} @ ${INSTALL_PLACES[i - 1]}`);
  }
}
