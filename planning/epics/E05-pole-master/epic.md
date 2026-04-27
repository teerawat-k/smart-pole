# E05 · Pole master module

> CRUD เสาสัญญาณ + lookup + sensor capability flags
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/pole.service.ts`

Priority: 2
Blocked by: E02
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Prisma schema Pole — fields + indexes + soft delete | todo |
| T02 | Pole module — CRUD + lookup + pagination | todo |
| T03 | Status enum + status update flow | todo |
| T04 | Pole MQTT credential — generate + store hashed | todo |
| T05 | Block delete pole ที่มี recording/alert ค้าง | todo |
| T06 | Geolocation validation (lat/lng range) | todo |

## Notes
- `poleStatus` เปลี่ยนเป็น Postgres enum (`online` | `offline` | `unknown` | `maintenance`)
- เพิ่ม field `mqttUsername`, `mqttPasswordHash` (ใช้ใน T04)
- Capability flags: `hasCamera`, `hasPm25Sensor`, `hasTempHumidity`, `hasLed`
- ส่ง flags เข้า frontend ตัดสินใจว่า dashboard tile ไหนแสดง
