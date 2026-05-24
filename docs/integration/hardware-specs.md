# Hardware Specifications

> สเปคของอุปกรณ์จริงที่ติดตั้งภาคสนาม — ไม่อยู่ใน source code, เก็บไว้ที่นี่เป็นแหล่งอ้างอิงเดียว
>
> ⚠️ **ข้อมูลใน document นี้รวม credential dev** — production ต้อง rotate (ดู [production-readiness.md](../production-readiness.md))

---

## 1. กล้อง CCTV

### Model
**Dahua IPC-HFW5442E-ZE** (full model: DH-IPC-HFW5442E-ZE)

| รายการ | ค่า |
|---|---|
| ตัวเลขใน DB | `Pole.cameraModel` default = `"Dahua IPC-HFW5442E-ZE"` ([pole.constants.ts:3](../../backend/src/modules/pole/pole.constants.ts)) |
| Resolution | 2688 × 1520 (4MP) |
| Codec | H.265 (HEVC) |
| Frame rate | 25 fps |
| Network | Ethernet (PoE) |
| IR night vision | ✅ |

### Connection (dev camera ตัวอย่าง)

| รายการ | ค่า |
|---|---|
| IP (dev) | `192.168.1.108` |
| Username | `admin` |
| Password (dev) | `!@34ZXcv` ⚠️ rotate ก่อน production |
| Web UI | `http://192.168.1.108` |
| RTSP main stream | `rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=0` |
| RTSP sub stream | `rtsp://admin:!@34ZXcv@192.168.1.108/cam/realmonitor?channel=1&subtype=1` |
| ทดสอบแล้ว | ✅ FFmpeg connect ได้ |

### RTSP → SRS (planned)

ดู [./srs-streaming.md](./srs-streaming.md) — SRS pull RTSP จากกล้อง → push HLS + DVR mp4

---

## 2. Raspberry Pi (เสาแต่ละต้น)

### Hardware
- Raspberry Pi 4 Model B (recommended) หรือ Pi 3B+
- microSD ≥ 32 GB

### OS & Setup

| รายการ | ค่า |
|---|---|
| OS | Raspberry Pi OS Lite 64-bit (Bookworm) |
| Static IP (dev) | `192.168.1.147` |
| User | `pi` |
| Project path | `/home/pi/smartpole/` |
| Main script | `/home/pi/smartpole/main.py` |
| Python venv | `/home/pi/smartpole-env/` |
| Systemd service | `smartpole.service` (auto-start on boot) |

### Service status

```bash
sudo systemctl status smartpole
sudo journalctl -u smartpole -f       # tail logs
sudo systemctl restart smartpole
```

### MQTT Connection
- Broker (production): `mqtt://152.42.242.162:7783`
- Username: `<poleName>` (เช่น `pole-01`)
- Password: random hex 32 byte จาก `POST /api/poles` หรือ `POST /api/poles/:id/regenerate-credential` (ดูครั้งเดียว)
- Topic ที่ publish: `smartpole/<poleName>/sensor` (ดู [../mqtt-spec.md](../mqtt-spec.md))

---

## 3. Sensor — PM2510TH-OD

### Model
**PM2510TH-OD** (sumtech.co.th) — Outdoor 4-in-1 sensor

- 🔗 https://www.sumtech.co.th/product-detail.html?pd_code=PM2510TH-OD

### Spec

| รายการ | ค่า |
|---|---|
| Type | Outdoor PM2.5 + **PM10** + Temperature + Humidity |
| Output | RS485 Modbus RTU |
| ติดตั้ง | กล่องกันน้ำ IP65+ |
| Power | 12V DC |
| ระยะ data | depends on cable — max ~100m บน twisted pair |

### ⚠️ Design Gap: PM10 data ไม่ถูกเก็บใน DB

Sensor รองรับ **PM10** ด้วย แต่ระบบปัจจุบัน:
- `SensorReading` table ไม่มี column `pm10` ([backend/prisma/schema.prisma](../../backend/prisma/schema.prisma):277-291)
- `Pole` ไม่มี `latestPm10` / `hasPm10Sensor` flag
- MQTT schema `sensorMessageSchema` ไม่ validate `pm10` ([backend/src/plugins/mqtt/schemas.ts](../../backend/src/plugins/mqtt/schemas.ts))

→ ดู [production-readiness.md](../production-readiness.md) P2-3 สำหรับ proposal เพิ่ม PM10

### RS485 → Pi Bridge

ต้องการ **USB-RS485 adapter** เพื่อให้ Pi อ่าน Modbus:

| รายการ | ค่า |
|---|---|
| Adapter ที่แนะนำ | FTDI FT232RL chipset (USB-to-RS485) |
| ราคา | ~200 บาท |
| สถานะ | ⚠️ ยังไม่ได้ซื้อ — sensor data ปัจจุบัน hardcode จาก Pi script (mock) |

---

## 4. Cloud / Network (Development → UAT)

### DigitalOcean Server (current UAT)

| รายการ | ค่า |
|---|---|
| Public IP | `152.42.242.162` |
| Frontend access | http://152.42.242.162:7765 |
| Backend API | http://152.42.242.162:7766 (ผ่าน Docker compose) |
| MQTT TCP | `tcp://152.42.242.162:7783` |
| MQTT WebSocket | `tcp://152.42.242.162:7791` |
| RTMP (SRS, planned) | `tcp://152.42.242.162:1935` ⚠️ ยังไม่เปิด port |

### Production (planned)
- On-Premise server + DDNS (Dyn บริการ paid)
- ฟิลด์ใน DB: `Pole.ddnsHostname` (unique nullable) — รองรับการเชื่อม pole ผ่าน DDNS

---

## 5. LED (อนาคต)

- มี flag `Pole.hasLed` ใน schema (boolean) — bool flag เก็บไว้แต่ยังไม่มี control flow
- Hardware control method **ยังไม่ตัดสินใจ** — เลือกได้ระหว่าง:
  - Relay (on/off)
  - PWM (dimming)
  - DALI (lighting protocol)
  - 0-10V (analog dim)
- ต้อง confirm กับ stakeholder ก่อน implement

---

## 6. ภาพรวมการเชื่อมต่อ (สนาม)

```
┌──────────────────────────────────────────────────┐
│  เสาแต่ละต้น (field)                              │
│  ┌─────────────────────────┐                     │
│  │ Sensor PM2510TH-OD       │                     │
│  │ (RS485 Modbus RTU)       │                     │
│  └──────────┬──────────────┘                     │
│             │ RS485                              │
│  ┌──────────▼─────────────┐  ┌──────────────┐   │
│  │ USB-RS485 (FTDI)        │  │  กล้อง Dahua  │   │
│  │ (ยังไม่ได้ซื้อ)         │  │  IPC-HFW5442E │   │
│  └──────────┬─────────────┘  └──────┬───────┘   │
│             │ USB                    │ Ethernet  │
│  ┌──────────▼────────────────────────▼───────┐   │
│  │  Raspberry Pi (192.168.1.147)              │   │
│  │  ├─ main.py (paho-mqtt)                    │   │
│  │  ├─ FFmpeg (RTMP push — planned)           │   │
│  │  └─ systemd: smartpole.service             │   │
│  └──────────┬─────────────────────────────────┘   │
└─────────────┼─────────────────────────────────────┘
              │ 4G / Internet / DDNS
              ▼
┌──────────────────────────────────────────────────┐
│  Server (DigitalOcean — 152.42.242.162)          │
│  ├─ Mosquitto :7783 (TCP)                        │
│  ├─ Backend   :7766 (REST + WS + MQTT subscribe) │
│  ├─ Frontend  :7765 (Next.js)                    │
│  └─ Postgres  (local install บน host)            │
└──────────────────────────────────────────────────┘
```

---

## 7. Hardware ที่ยังไม่ซื้อ (สั่งก่อน production)

- USB-RS485 FTDI FT232RL — ~200 ฿
- SIM card 4G สำหรับ router (Pi เชื่อม internet)
- โคม LED (ขึ้นกับ method ที่เลือก)
- กล่องกันน้ำ IP65 + เสายึด + power supply 12V

---

## หมายเหตุ Security

| ข้อมูล | สถานะ | Action |
|---|---|---|
| Camera password `!@34ZXcv` | ⚠️ dev only | ก่อน production: rotate + ใช้ password เฉพาะของแต่ละกล้อง |
| Pi IP `192.168.1.147` | ⚠️ dev | ในสนาม Pi จะอยู่หลัง NAT — ใช้ DDNS หรือ VPN |
| DO IP เผยแพร่ใน doc นี้ | OK | server เปิด public แล้ว — กัน traffic ผ่าน firewall + rate limit |
| MQTT credential per pole | ✅ design ถูก | ปัจจุบัน Mosquitto allow_anonymous=true — ต้องเปิด auth (P1-1) |
