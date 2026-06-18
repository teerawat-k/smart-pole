# รายการอุปกรณ์ติดตั้งต่อ 1 เสา (Bill of Materials)

> Smart Pole pilot — equipment ที่ต้องเตรียมต่อเสา 1 ต้น
> สร้าง: 2026-06-17
> ราคาประมาณ (อาจเปลี่ยนตามตลาด)

---

## 📊 สรุป Cost

```
Core (จำเป็น):           ~28,000-35,000 บาท
Optional (แนะนำ):        ~15,000-25,000 บาท
─────────────────────────────────────────
รวม:                     ~43,000-60,000 บาท / เสา
+ ค่า SIM/Internet:       ~1,800/เดือน (true unlimited 5G)
```

---

## 1. 🖥️ Computing — Raspberry Pi 5

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| Raspberry Pi 5 | 4GB RAM model | 1 | 3,200-3,800 | ขายจาก official distributor |
| Active Cooler | Official Pi 5 Active Cooler | 1 | 350-500 | จำเป็น — Pi 5 run hot |
| MicroSD Card | 32 GB Class A2 (SanDisk Extreme / Samsung Pro) | 1 | 400-600 | A2 = random IOPS เร็ว |
| USB-C PD Adapter | 5V 5A 27W official Pi 5 | 1 | 800-1,000 | ต้อง USB-PD ไม่ใช่ adapter ทั่วไป |
| Pi 5 Case | Argon NEO 5 หรือ official case | 1 | 600-1,200 | ออกแบบสำหรับ active cooler |
| **Subtotal** | | | **5,350-7,100** | |

### หมายเหตุ Pi 5
- ห้ามใช้ adapter ของ Pi 4 (5V/3A) — Pi 5 throttle
- ต้องใส่ active cooler — ไม่งั้น CPU throttle ตอน ffmpeg load
- ถ้าใส่ใน outdoor enclosure ที่ไม่มี ventilation → temp อาจถึง 70°C+

---

## 2. 📡 Network — Mobile LTE/5G

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| 5G/4G LTE Router | Huawei B818-263 (5G) | 1 | 8,000-10,000 | ดีสุด — รองรับ true 5G |
|  | หรือ TP-Link MR600 (4G+) | 1 | 4,500-5,500 | ทดแทนถ้า 4G พอ |
|  | หรือ USB 4G dongle E3372 | 1 | 1,200-1,800 | ประหยัด แต่ต้องใช้กับ Pi USB |
| SIM Card | True unlimited 5G corporate | 1 | 0 (เริ่ม) | ค่ารายเดือนแยก |
| LAN Cable | CAT6 outdoor 3m | 1 | 200-400 | ระหว่าง modem ↔ Pi |
| **External Antenna** | LPDA 5G/4G 9-12 dBi | 1 | 1,500-3,000 | จำเป็นถ้า signal อ่อน |
| Antenna Cable | LMR-400 5m + TS9/SMA connector | 1 | 800-1,500 | low-loss สำหรับ outdoor |
| **Subtotal** | | | **2,700-16,200** | (ขึ้นกับ option modem + antenna) |

### หมายเหตุ Network
- **ต้อง plan true unlimited (ไม่มี FUP)** — เราใช้ ~160 GB/เดือนต่อเสา
- AIS Business 5G ~1,800 บาท/เดือน หรือ NT Corporate
- External antenna จำเป็นถ้า signal RSRP < -100 dBm หรือเสาในตึก

---

## 3. 🌡️ Sensor — PM2510TH-OD

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| Air Quality Sensor | Sumtech PM2510TH-OD | 1 | 4,500-6,000 | PM1/PM2.5/PM10/Temp/Humidity |
| iocrest USB to RS-422/485 | adapter (FTDI chipset) | 1 | 600-900 | USB-A → terminal RS485 |
| UTP CAT5e cable | สาย LAN เก่า/ใหม่ ~5m | 1 | 100-200 | สำหรับ A/B line + jumper |
| Sensor Mount Bracket | Triangle bracket (มาในชุด) | 1 | (รวม) | มากับ sensor |
| **Subtotal** | | | **5,200-7,100** | |

### หมายเหตุ Sensor
- Sensor ทำงาน 12V DC (กิน <85 mA) — ดูข้อ Power
- ต้อง jumper TX+/RX+ และ TX-/RX- ใน adapter (RS485 2-wire mode)
- ดูคู่มือ wiring + jumper ใน [conversation history (Pi connect sensor section)]

---

## 4. 📹 Camera — IP CCTV

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| IP Camera | Dahua IPC-HFW5442E-ZE (4 MP, motorized zoom) | 1 | 8,500-12,000 | bullet, IP67, IR night |
|  | หรือ Hikvision DS-2CD2T46G2-2I (4 MP, fixed) | 1 | 5,500-7,500 | ราคาประหยัดกว่า |
| PoE Injector | Single port 802.3at 30W | 1 | 700-1,200 | ถ้า camera รองรับ PoE |
| Camera Mount | Pole mount bracket | 1 | 500-1,000 | universal pole adapter |
| Sun Shield | (มาในชุดบางรุ่น) | (1) | (รวม) | กันแดด/ฝน |
| LAN Cable | CAT6 outdoor 10m (ถึงเสาบนสุด) | 1 | 500-800 | direct burial / UV resistant |
| **Subtotal** | | | **10,200-17,500** | |

### หมายเหตุ Camera
- ใช้ RTSP — `rtsp://admin:<pass>@<ip>/cam/realmonitor?channel=1&subtype=1`
- subtype=1 (sub stream) = ~256 kbps — ใช้สำหรับ live + record
- subtype=0 (main stream) = ~2-4 Mbps — quality สูงขึ้น แต่ bandwidth × 8

---

## 5. ⚡ Power System

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| 12V DC PSU | Mean Well 12V/2A weatherproof | 1 | 700-1,200 | สำหรับ sensor + อื่นๆ |
| 5V/5A USB-C PSU | (อยู่ใน Computing) | - | - | ใช้ของ Pi 5 |
| Surge Protector | AC surge protector single | 1 | 400-800 | กัน lightning ใกล้เคียง |
| **UPS (optional)** | APC Back-UPS 650VA | 1 | 2,500-3,500 | runtime ~30 min — แนะนำ |
|  | หรือ DC UPS 12V 7Ah battery + charger | 1 | 1,500-2,500 | ราคาประหยัด, ติดตั้งซับซ้อนกว่า |
| Power Strip | 4-outlet with surge | 1 | 300-500 | กระจายไฟใน enclosure |
| DC barrel jack | 5.5×2.1mm (สำหรับ sensor) | 2 | 50-100 | ต่อ 12V PSU → sensor |
| **Subtotal** | | | **1,950-6,100** | (ขึ้นกับ UPS option) |

### หมายเหตุ Power
- รวม power consumption ต่อเสา: ~20-25W (Pi 5 5-7W + camera 8-10W + modem 5W + sensor <1W)
- UPS แนะนำ — กันไฟตกชั่วคราว + ทำให้ shutdown gracefully

---

## 6. 📦 Enclosure (กล่องกันน้ำ)

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| Outdoor IP65 Enclosure | 30×40×15cm พลาสติก ABS | 1 | 1,200-2,500 | กันน้ำ + UV resistant |
|  | หรือ metal IP66 | 1 | 2,500-4,500 | คงทนกว่า แต่หนัก |
| Cable Glands | PG13.5 พร้อม seal | 6-8 | 30-60/ตัว | กัน cable ผ่านกันน้ำ |
| Mounting Plate | DIN rail หรือ perforated steel | 1 | 200-400 | ติดอุปกรณ์ภายใน |
| Desiccant Pack | silica gel ขนาดใหญ่ + indicator | 2 | 100-200 | กันความชื้น |
| Ventilation Fan | 12V 80mm + air filter | 1 | 400-800 | แนะนำ (ลด temp ภายใน) |
| Pole Mount Bracket | U-bolt clamp 50-100mm | 1-2 | 500-1,200 | ขึ้นกับเส้นผ่าศูนย์กลางเสา |
| **Subtotal** | | | **2,700-9,500** | |

### หมายเหตุ Enclosure
- IP65 minimum สำหรับ outdoor (กันฝน + ฝุ่น)
- ขนาด ≥30×40×15cm พอใส่ Pi + UPS + modem + power distribution
- ปล่อย space ~30% ให้ระบายความร้อน

---

## 7. 🔗 Cabling + Misc

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| CAT6 Outdoor Cable | 305m roll (สำรอง + extension) | 0.5 | 1,500-2,500 | direct burial UV resistant |
| AC Power Cable | 2.5mm² 3-core 10m | 1 | 300-500 | ถ้าต้องเดินไฟใหม่ |
| Cable Ties | UV-resistant black 200mm | 50 ชุด | 100-200 | ยึดสายใน enclosure |
| Cable Markers | sleeve numbered | 1 set | 200-400 | label สาย — สำคัญสำหรับ maintenance |
| Heat Shrink Tube | assorted sizes | 1 set | 200-400 | กันสาย short |
| **Subtotal** | | | **2,300-4,000** | |

---

## 8. 🛡️ Optional / Recommended

| รายการ | สเปก / รุ่น | จำนวน | ราคา (บาท) | หมายเหตุ |
|---|---|---|---|---|
| **Lightning Arrestor** | RJ45 LAN protector | 1-2 | 500-1,000/ตัว | กัน lightning ผ่าน LAN cable |
| **Solar Panel** (ถ้าไม่มี AC) | 100W mono + MPPT controller + battery 100Ah | 1 set | 12,000-18,000 | ตัวเลือกถ้าเสาไม่มีไฟ AC |
| **GPS Module** (future) | u-blox NEO-7M USB | 1 | 800-1,500 | ถ้าต้องการ pole location ในระบบ |
| **Outdoor camera enclosure extra** | IP67 housing | 1 | 1,500-2,500 | ถ้า camera ที่เลือกไม่ wateproof พอ |
| **Maintenance toolkit** (1 set ต่อโครงการ) | screwdriver + multimeter + cable tester + USB-C HDMI capture | - | 3,000-5,000 | สำหรับ on-site debug |

---

## 9. 📋 รวมต่อเสา (Realistic Pricing)

### Option A — Basic Pilot (no UPS, no external antenna)
```
Computing:       5,350-7,100
Network:         2,700-7,300   (modem + LAN, no antenna)
Sensor:          5,200-7,100
Camera:         10,200-17,500
Power:           1,950-2,500
Enclosure:       2,700-5,000   (plastic basic)
Cabling:         2,300-4,000
─────────────────────────────
Total:          30,400-50,500 บาท
```

### Option B — Production-grade (with UPS + external antenna + metal enclosure)
```
Computing:       5,350-7,100
Network:         4,200-16,200  (5G modem + LPDA antenna + LMR cable)
Sensor:          5,200-7,100
Camera:         10,200-17,500
Power:           4,450-6,100   (+ UPS)
Enclosure:       4,200-9,500   (metal + ventilation + mounting)
Cabling:         2,300-4,000
Optional:        1,000-2,000   (lightning arrestor)
─────────────────────────────
Total:          36,900-69,500 บาท
```

### Option C — Solar-powered remote (no AC available)
```
Option B base:           36,900-69,500
+ Solar panel + battery: 12,000-18,000
─────────────────────────
Total:                   48,900-87,500 บาท
```

---

## 10. 💸 Monthly Recurring Cost ต่อเสา

| รายการ | ราคา/เดือน (บาท) | หมายเหตุ |
|---|---|---|
| SIM 5G/4G true unlimited | 1,500-1,800 | corporate plan (no FUP) |
| Electricity (Pi+camera+modem ~25W) | ~150-200 | 25W × 24h × 30d × 7 บ./kWh |
| **รวม** | **1,650-2,000** | |

---

## 11. 🛒 ที่ขายในไทย — Source

| Category | Recommended Source |
|---|---|
| Raspberry Pi 5 + accessories | Cytron, ThaiEasyElec, Element14, Lazada/Shopee |
| iocrest RS485 adapter | Lazada/Shopee — search "iocrest USB RS485" |
| Sumtech sensor | Sumtech direct (sumtech.co.th, 02-270-0500) |
| Dahua/Hikvision IP camera | บ้านหม้อ, Banana IT, JIB, Vimanee |
| 5G/4G LTE modem | Huawei store, AIS shop (เปิดร้านขายของ device-ready) |
| External antenna | Lazada/Shopee — search "5G antenna LPDA outdoor" |
| Enclosure + cable glands | RS Components Thailand, AECO หรือ บ้านหม้อ |
| Mean Well power supply | RS Components, Element14 |
| Cable + tools | บ้านหม้อ, RS Components |

---

## 12. ✅ Pre-deployment Checklist (ต่อเสา)

```
[ ] Order ครบทุก item — wait delivery ~1-2 weeks
[ ] รับของ + verify model ตรงสเปก
[ ] Bench test ก่อนติดตั้งหน้างาน:
    [ ] Pi 5 boot + SSH + active cooler ทำงาน
    [ ] Sensor read ได้ค่า realistic
    [ ] Camera stream ได้ผ่าน VLC
    [ ] LTE modem connect + speedtest
[ ] Provision Pi (run migrate-pi.sh)
[ ] ติดตั้ง Tailscale บน Pi (กัน CGNAT inbound block)
[ ] Pack ทุกอุปกรณ์ใน enclosure แบบ pre-wired
[ ] นำขึ้นเสาหน้างาน — wiring + power
[ ] verify ปลายทาง dashboard เห็นเสา online
```

---

## 13. 🔧 Spare Parts (สต๊อกไว้ใช้)

แนะนำ 1 set ต่อ 5-10 เสา:

```
[ ] Pi 5 board + SDcard ใหม่ (spare ถ้าตัวหลักพัง)
[ ] USB-C PD adapter spare 1 ตัว
[ ] iocrest USB-RS485 adapter spare 1 ตัว
[ ] CAT6 cable assorted lengths
[ ] Sensor 1 ตัว (PM2510TH-OD)
[ ] Camera 1 ตัว (ตรง model)
[ ] Cable glands ครบเซ็ต
[ ] Tools: multimeter, USB-RS485 cable tester
```

ราคา spare set: ~15,000-25,000 บาท

---

## 📚 Reference Docs

- [migrate-pi.sh](../../infra/pole-firmware/migrate-pi.sh) — provision Pi
- [MIGRATION-CHECKLIST.md](../../infra/pole-firmware/MIGRATION-CHECKLIST.md) — Pi swap runbook
- [security-hardening.md](../security-hardening.md) — security setup
- [Sumtech PM2510TH-OD User Manual](../../infra/sensors/PM2510TH-OD_manual.pdf) — sensor datasheet
- [decision-log.md](../decision-log.md) — architecture decisions
