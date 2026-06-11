// CLI: สร้างเสาใหม่ + generate MQTT credential (ผ่าน DB ตรง — ไม่ผ่าน HTTP)
// ใช้สำหรับ provisioning script ที่ทำงาน batch หรือ admin command-line
//
// รันใน backend container:
//   docker compose exec backend bun scripts/create-pole.ts \
//     --pole-name pole-02 \
//     --install-place "ทางเข้าอาคาร B" \
//     --has-camera
//
// Output: JSON ที่มี mqttPassword (plain) — แสดงครั้งเดียว เก็บไว้สำหรับ config Pi

import "../src/config/env";
import { createPole } from "@/modules/pole/flow/create";
import { prisma } from "@/plugins/prisma";

interface Args {
  poleName?: string;
  installPlace?: string;
  hasCamera: boolean;
  hasPm25Sensor: boolean;
  hasTempHumidity: boolean;
  hasLed: boolean;
  ipCamera?: string;
}

function parseArgs(): Args {
  const args: Args = {
    hasCamera: false,
    hasPm25Sensor: false,
    hasTempHumidity: false,
    hasLed: false,
  };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const cur = argv[i]!;
    switch (cur) {
      case "--pole-name":          args.poleName       = argv[++i]; break;
      case "--install-place":      args.installPlace   = argv[++i]; break;
      case "--ip-camera":          args.ipCamera       = argv[++i]; break;
      case "--has-camera":         args.hasCamera         = true; break;
      case "--has-pm25":           args.hasPm25Sensor     = true; break;
      case "--has-temp-humidity":  args.hasTempHumidity   = true; break;
      case "--has-led":            args.hasLed            = true; break;
      default:
        console.error(`unknown arg: ${cur}`);
        process.exit(2);
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!args.poleName || !args.installPlace) {
    console.error(JSON.stringify({
      error: "missing required: --pole-name and --install-place",
      example: 'bun scripts/create-pole.ts --pole-name pole-02 --install-place "ทางเข้า B" --has-camera --has-pm25 --has-temp-humidity',
    }, null, 2));
    process.exit(2);
  }

  // หา admin user เป็นผู้สร้าง (system seed user)
  const admin = await prisma.user.findUnique({
    where: { username: "admin" },
    select: { id: true },
  });
  if (!admin) {
    console.error(JSON.stringify({ error: "admin user not found — run seeds first" }));
    process.exit(3);
  }

  try {
    const result = await createPole(
      {
        poleName:        args.poleName,
        installPlace:    args.installPlace,
        hasCamera:       args.hasCamera,
        hasPm25Sensor:   args.hasPm25Sensor,
        hasTempHumidity: args.hasTempHumidity,
        hasLed:          args.hasLed,
        ipCamera:        args.ipCamera,
      },
      admin.id,
    );

    // Output: machine-readable JSON
    console.log(JSON.stringify({
      success:        true,
      poleId:         result.pole.id,
      poleName:       result.pole.poleName,
      installPlace:   result.pole.installPlace,
      mqttUsername:   result.pole.mqttUsername,
      mqttPassword:   result.mqttPassword,
      warning:        "MQTT password แสดงครั้งเดียว — เก็บเอาไป config Pi ทันที",
    }, null, 2));
  } catch (e) {
    const err = e as Error & { code?: string };
    console.error(JSON.stringify({
      success: false,
      error:   err.message,
      code:    err.code,
    }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(JSON.stringify({ success: false, error: String(e) }));
  process.exit(1);
});
