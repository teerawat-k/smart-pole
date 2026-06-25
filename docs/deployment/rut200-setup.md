# คู่มือติดตั้งและตั้งค่า Teltonika RUT200 (Smart Pole 4G)

> เราเตอร์ 4G LTE ประจำเสา — เชื่อม Raspberry Pi + กล้อง CCTV เข้า mobile network (True SIM)
> ก่อนนำไปติดตั้ง: provision เสาบน network ที่เป็น public IP ก่อน (ดู [decision-log `4G/CGNAT`](../decision-log.md))

---

## 1. ภาพรวมและบริบท

RUT200 ทำหน้าที่เป็น **gateway 4G** ของเสา — อุปกรณ์ในเสา (Pi + กล้อง) ต่อเข้า LAN ของ RUT200 แล้วออกเน็ตผ่าน SIM

```
   กล้อง CCTV  ── LAN1 ┐
  192.168.1.108         ├─ RUT200 ─ SIM ─((4G))─ True ─ Internet ─ DO host
   Raspberry Pi ── LAN2 ┘   WAN(eth) → reassign เป็น LAN        152.42.242.162
   (eth0)
```

> **พอร์ต:** RUT200 มี Ethernet 2 พอร์ต — default **1 WAN + 1 LAN** แต่เน็ตมาจาก **SIM** → พอร์ต WAN ว่าง → **reassign WAN เป็น LAN** (ดูขั้นที่ 4) ได้ **2 LAN พอดี** → ต่อ **กล้อง + Pi โดยตรง ไม่ต้องใช้ switch** (switch จำเป็นเฉพาะถ้าต่อ > 2 อุปกรณ์)

| Data flow | ทิศทาง | ผ่าน 4G |
|---|---|---|
| MQTT / RTMP / rsync (เสา→DO) | outbound | ✅ |
| RTSP กล้อง (Pi→กล้อง) | ภายใน LAN | ไม่วิ่ง 4G |
| SSH เข้าเสา (DO→เสา) | inbound | ❌ CGNAT บล็อก (ทำ maintenance ผ่าน VPN — pending) |

---

## 2. Factory Default (ค่าจากโรงงาน)

| รายการ | ค่า |
|---|---|
| **Gateway / LAN IP** | `192.168.1.1` |
| **Web UI** | `https://192.168.1.1` (RUTOS ใช้ HTTPS) |
| **Login user** | `admin` |
| **Login password** | `admin01` *(หรือ unique บน label ถ้า batch ≥ 5)* — บังคับเปลี่ยนตอน login ครั้งแรก |
| **WiFi SSID** | `RUT200_XXXX` (XXXX = เลขท้าย MAC) |
| **WiFi password** | **unique ต่อเครื่อง — ดูที่สติกเกอร์หลังเครื่อง** (ไม่มีค่ากลาง) |

> WiFi password + admin password (batch ใหม่) + SSID อยู่บน **สติกเกอร์/engraving หลังเครื่อง** — ยึดค่านั้นเป็นหลัก

---

## 3. ขั้นตอนการตั้งค่า (ทีละขั้น)

### ขั้นที่ 1 — เข้าครั้งแรก + เปลี่ยนรหัส admin

1. ใส่ SIM (ปิดเครื่องก่อนเสมอ) แล้วเปิดเครื่อง รอ ~2 นาทีให้ boot
2. ต่อเข้า RUT200 ทางใดทางหนึ่ง:
   - **สาย LAN:** เสียบ Ethernet จากโน้ตบุ๊กเข้าพอร์ต **LAN** → รับ IP อัตโนมัติ (DHCP)
   - **WiFi:** เชื่อม SSID `RUT200_XXXX` ด้วย passkey บนสติกเกอร์
3. เปิดเบราว์เซอร์ → `https://192.168.1.1` (ยอมรับ cert warning ครั้งแรก)
4. login `admin` / รหัสบนสติกเกอร์ (หรือ `admin01`)
5. **ตั้งรหัส admin ใหม่** (บังคับ) — รหัสแข็ง ≥ 12 ตัว เก็บใน password manager

### ขั้นที่ 2 — ตั้งค่า Mobile / APN (True SIM)

ไปที่ **Network → Mobile** (หรือ Setup Wizard ขั้น Mobile)

1. **SIM PIN:** ถ้า SIM มี PIN ให้ใส่ (IoT/Netsim ส่วนใหญ่ปิด PIN ไว้)
2. **Auto APN:** ลองเปิด **ON** ก่อน — RUTOS มีฐานข้อมูล APN อาจตั้งให้อัตโนมัติ
3. ถ้าเน็ตไม่ขึ้น → ปิด Auto APN แล้วกรอกเอง:

   | ฟิลด์ | ค่า |
   |---|---|
   | APN | **True ทั่วไป: `internet`** — *แต่ Netsim (IoT/M2M) มัก APN เฉพาะ → ยึดเอกสารที่มากับ SIM* |
   | Authentication | None (ปกติ) |
   | Username / Password | เว้นว่าง (ปกติ) |
   | PDP / Network type | IPv4 (หรือ IPv4/IPv6) |

   > ⚠️ **Netsim True เป็น SIM IoT** — APN อาจไม่ใช่ `internet` ทั่วไป ให้ **เช็ค APN ที่ถูกต้องจากผู้ให้บริการ SIM** ก่อน ถ้าผิดจะ register network ไม่ได้

4. กด **Save & Apply** รอ ~1 นาที

### ขั้นที่ 3 — ตรวจการเชื่อมต่อ + เช็ค CGNAT

ไปที่ **Status → Mobile** ตรวจ:
- **Connection state:** Connected / Registered (home หรือ roaming)
- **Signal (RSSI/RSRP):** RSRP ดี = > -100 dBm (ยิ่งใกล้ 0 ยิ่งดี); ถ้าอ่อน ขยับเสาอากาศ
- **Operator:** TRUE / TRUE-H
- **IP address:** ได้ IP มาแล้ว

ทดสอบเน็ต — **System → CLI** (หรือ SSH เข้า RUT200) แล้วรัน:
```sh
ping -c 3 8.8.8.8           # ออกเน็ตได้ไหม
curl -s ifconfig.me; echo   # public IP ที่โลกเห็น
```
**เช็ค CGNAT:** เทียบ IP จาก `Status → Mobile` (IP ที่ SIM ได้) กับผลลัพธ์ `ifconfig.me`
- **ไม่ตรงกัน** → อยู่หลัง **CGNAT** (เกือบแน่นอน) → SSH เข้าเสาตรงไม่ได้ ต้องใช้ VPN/RMS (pending)
- ตรงกัน → มี public IP (กรณีพิเศษ/แพ็กเกจ static IP)

### ขั้นที่ 4 — ตั้งค่า LAN + ใช้พอร์ต WAN เป็น LAN ที่ 2

**4.1 LAN subnet** — ไปที่ **Network → LAN**

- LAN default = `192.168.1.1/24` **ตรงกับกล้องอยู่แล้ว → คงไว้ ไม่ต้องแก้**
  (อย่าเปลี่ยนเป็น subnet อื่น เพราะกล้อง static `192.168.1.108` + firmware เสาอ้างถึง IP นี้)
- **DHCP:** เปิด — กำหนด range เลี่ยง `.108` (กล้อง) เช่น `192.168.1.120–192.168.1.200`
- **Pi:** ตั้ง **Static lease (DHCP reservation)** ผูก MAC ของ Pi → IP คงที่ (เช่น `192.168.1.10`)

**4.2 Reassign พอร์ต WAN → LAN** (เน็ตมาจาก SIM → พอร์ต WAN ว่าง → ใช้เป็น LAN ที่ 2)

ไปที่ **Network → Interfaces / Ports** (อ้างอิง wiki ["Setting up WAN as LAN"](https://wiki.teltonika-networks.com/view/Setting_up_WAN_as_LAN)):

1. แก้ interface **WAN** → Physical Settings → เอา physical port ออก (เลือก *No interface*)
2. แก้ **WAN6** เช่นเดียวกัน
3. แก้ interface **LAN** → Physical Settings → **เพิ่มพอร์ต `wan`** เข้า bridge

→ ได้ **2 LAN port** → เสียบ **กล้อง + Pi โดยตรง ไม่ต้องใช้ switch**

> ⚠️ ทำหลัง Mobile/4G ใช้งานได้แล้ว (ขั้นที่ 2-3) เพราะหลัง reassign จะไม่มี wired WAN — internet ต้องมาจาก SIM เท่านั้น
> 💡 switch จำเป็นเฉพาะถ้าต่อ **> 2 อุปกรณ์** (เช่น เพิ่มกล้อง/NVR ภายหลัง)

### ขั้นที่ 5 — WiFi (ความปลอดภัย field device)

ไปที่ **Network → Wireless**

- **แนะนำ: ปิด WiFi AP** ถ้า Pi/กล้องต่อสาย (eth) ทั้งหมด → ลด attack surface ของอุปกรณ์กลางแจ้ง
- ถ้าจำเป็นต้องใช้ WiFi: เปลี่ยน SSID + ตั้ง **WPA2/WPA3 password แข็ง** (ห้ามใช้ค่า default บนสติกเกอร์ต่อ)

### ขั้นที่ 6 — เวลา / NTP (สำคัญต่อ recording)

ไปที่ **System → Administration → Date & Time** (หรือ Services → NTP)

- **Timezone:** `Asia/Bangkok (UTC+7)`
- **NTP:** เปิด sync อัตโนมัติ

> ⚠️ recording บน Pi ใช้ **segment ตาม clock** (`-segment_atclocktime`) → ถ้าเวลาเพี้ยน ไฟล์จะไม่ตรงเวลา/ไม่ align

### ขั้นที่ 7 — Firewall / Security baseline

ไปที่ **System → Administration → Access Control** และ **Network → Firewall**

- **WAN access ปิด:** WebUI/SSH จาก WAN (มือถือ) = **OFF** (default ปิดอยู่แล้ว + CGNAT บล็อกอยู่แล้ว — แต่ยืนยันให้ปิด)
- เปิด WebUI/SSH เฉพาะจาก **LAN** เท่านั้น
- ปิด service ที่ไม่ใช้ (เช่น HTTP redirect ให้บังคับ HTTPS)
- เปลี่ยน SSH port default (option) + key-only ถ้าจะใช้

### ขั้นที่ 8 (optional) — Data Limit Alert

> เรื่อง data quota awareness ระงับไว้ชั่วคราว — แต่ตั้ง alert บน router ทำได้เลย ต้นทุนต่ำ

ไปที่ **Network → Mobile → Data Limit** (หรือ Services → Mobile Utilities)
- ตั้ง **warning ~80 GB/เดือน** + SMS/email alert
- (option) auto-action เมื่อชน limit — พิจารณาตามนโยบาย

### ขั้นที่ 9 — Backup config

ไปที่ **System → Maintenance → Backup**
- **Download backup** เก็บไฟล์ config ไว้ (restore เครื่องใหม่/หลัง reset ได้เร็ว)
- ตั้งชื่อระบุเสา เช่น `rut200-pole-01-backup.tar.gz`

---

## 4. Checklist สรุป (ก่อนนำไปติดตั้ง)

- [ ] เปลี่ยนรหัส admin (แข็ง, เก็บ password manager)
- [ ] Mobile/APN ต่อเน็ตได้ (Status → Mobile = Connected)
- [ ] ทดสอบ `ping 8.8.8.8` + เช็ค CGNAT (`ifconfig.me`)
- [ ] LAN = `192.168.1.0/24`, DHCP เลี่ยง `.108`, Pi static lease
- [ ] กล้อง `192.168.1.108` ping เจอจาก Pi
- [ ] WiFi ปิด หรือ ตั้งรหัสแข็ง
- [ ] Timezone Asia/Bangkok + NTP sync
- [ ] WAN access ปิด (เข้าได้เฉพาะ LAN)
- [ ] (option) Data limit alert 80GB
- [ ] Backup config ดาวน์โหลดเก็บ
- [ ] ทดสอบ end-to-end: Pi boot → MQTT/stream/record เข้า DO ผ่าน 4G

---

## 5. Troubleshooting

| อาการ | ตรวจ/แก้ |
|---|---|
| Mobile ไม่ Connected | APN ผิด (เช็คกับผู้ให้บริการ SIM) / SIM PIN / สัญญาณอ่อน / SIM ไม่ activate |
| สัญญาณอ่อน (RSRP < -110) | ขยับ/เพิ่มเสาอากาศ LTE, หาตำแหน่งสัญญาณดี |
| Pi/กล้อง ไม่ได้ IP | reassign WAN→LAN แล้วหรือยัง (ขั้น 4.2), DHCP เปิดไหม, เสียบถูกพอร์ต LAN ไหม |
| กล้อง ping ไม่เจอ | กล้องยัง `192.168.1.108`? subnet ตรงไหม |
| ออกเน็ตไม่ได้แต่ Mobile Connected | APN/PDP type, ตรวจ data limit ว่าชนหรือยัง |
| SSH เข้าเสาจากนอกไม่ได้ | ปกติ (CGNAT) — ต้องผ่าน VPN/RMS (pending) |

## 6. Reset / Recovery

- **Soft reset:** System → Maintenance → Reset to defaults
- **Hard reset:** กดปุ่ม **Reset ค้าง ~5 วินาที** → factory default → เข้า `192.168.1.1` ใหม่
- หลัง reset: restore backup (ขั้นที่ 9) เพื่อกลับ config เดิมเร็ว

---

## อ้างอิง

- [RUT200 Setup Wizard — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_Setup_Wizard)
- [RUT200 Mobile — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_Mobile)
- [RUT200 LAN — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_LAN)
- [RUT200 Wireless — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_Wireless)
- [RUT200 Administration — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_Administration)
- [RUT200 Device Recovery Options — Teltonika Wiki](https://wiki.teltonika-networks.com/view/RUT200_Device_Recovery_Options)

> หมายเหตุ: เมนู WebUI อาจต่างเล็กน้อยตามเวอร์ชัน RUTOS — ยึดโครงสร้าง Network/System ตามด้านบน · **APN ของ Netsim True ต้องยืนยันกับผู้ให้บริการ SIM** (ค่า `internet` เป็นของ True consumer ทั่วไป อาจไม่ตรงกับ SIM IoT)
