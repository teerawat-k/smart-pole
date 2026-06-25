# Pole Firmware

ไฟล์ที่รันบน Raspberry Pi (ต่อกล้อง + sensor) — เก็บ versioning ใน repo เพื่อ rollback ได้

## ไฟล์

| File | หน้าที่ | Pi path |
|---|---|---|
| `main.py` | MQTT publisher — ส่ง sensor data ทุก 5 นาที | `/home/pi/smartpole/main.py` |
| `stream-rtmp.sh` | ffmpeg RTMP push → SRS (live playback) | `/home/pi/smartpole/stream-rtmp.sh` |
| `record-mp4.sh` | ffmpeg segment mp4 30 นาที (DVR) | `/home/pi/smartpole/record-mp4.sh` |
| `sync-recordings.sh` | rsync mp4 ที่บันทึก → DO ทุก 5 นาที (cron) | `/home/pi/smartpole/sync-recordings.sh` |
| `cleanup-recordings.sh` | ลบ clip > 36 ชม.บน Pi (cron ทุก 6 ชม.) | `/home/pi/smartpole/cleanup-recordings.sh` |
| `smartpole.service` | systemd unit สำหรับ `main.py` | `/etc/systemd/system/smartpole.service` |
| `smartpole-stream.service` | systemd unit สำหรับ `stream-rtmp.sh` (live) | `/etc/systemd/system/smartpole-stream.service` |
| `smartpole-record.service` | systemd unit สำหรับ `record-mp4.sh` (DVR) | `/etc/systemd/system/smartpole-record.service` |
| `sensor.py` | PM2510TH-OD sensor driver (Modbus RTU) | `/home/pi/smartpole/sensor.py` |
| `provision-pi.sh` | สคริปต์ **เพิ่ม pole ใหม่** (สร้าง DB + ลง Pi) | (รันจาก dev machine) |
| `migrate-pi.sh` | สคริปต์ **สลับ Pi hardware** ของเสาที่มีอยู่แล้ว | (รันจาก dev machine) |
| `deploy-firmware-fleet.sh` | **push firmware pole-agnostic ไปทุกเสา** ใน `fleet.txt` พร้อมกัน | (รันจาก dev machine) |

## DVR Architecture

```
Camera RTSP ─┬→ ffmpeg #1 (smartpole-stream): RTSP → H.264 + silent AAC → RTMP push → SRS → HLS live
             │
             └→ ffmpeg #2 (smartpole-record): RTSP → H.264 + silent AAC → mp4 segment 30 นาที (local)
                  ↓ rsync ทุก 5 นาที (sync-recordings.sh cron)
DO: /var/www/smart-pole/data/uploads/camera/<poleName>/<date>/<file>.mp4
                  ↓
Backend camera-clip service (filesystem browser)
                  ↓
Dashboard /camera page

Retention:
  Pi 36 ชม. (cron ทุก 6 ชม.)
  DO 7 วัน (cron daily 4am)
```

### ทำไมแยก 2 ffmpeg ไม่ใช้ tee muxer?

ffmpeg `-f tee` กับ FLV/RTMP slave มีปัญหา timing ตอน startup — RTMP fail ครั้งแรก, `onfail=ignore` ทำให้ live ตาย (recording ยังทำงาน)
แยก 2 process: simple + reliable + failure isolated
Cost: 2× transcode CPU = ~110% ของ 1 core (Pi 4 มี 4 cores พอเหลือ) + 2× RTSP pull จากกล้อง (Dahua รองรับหลาย client)

## Fleet deploy — push firmware หลายเสาพร้อมกัน

อัปเดตไฟล์ firmware ที่ **pole-agnostic** (ไม่มี per-pole credential) ไปทุกเสาในครั้งเดียว

```bash
cp fleet.example.txt fleet.txt        # ใส่เสาจริง (fleet.txt ถูก gitignore)
./deploy-firmware-fleet.sh --files "cleanup-recordings.sh"
./deploy-firmware-fleet.sh --files "cleanup-recordings.sh" --restart "smartpole-record" --dry-run
```

- เสา offline ถูกข้าม (ไม่ล้มทั้ง fleet) → retry รอบหน้า, สรุปผล ok/skipped/failed ท้ายรัน
- **⚠️ ห้าม fleet-push** `main.py` / `stream-rtmp.sh` / `record-mp4.sh` / `sync-recordings.sh` — ไฟล์เหล่านี้ถูก patch credential ต่อเสา (MQTT/RTSP) → ใช้ `provision-pi.sh` / `migrate-pi.sh` เท่านั้น
- `--restart` ต้องตั้ง NOPASSWD sudo บน Pi (services เป็น system unit)
- **🔴 SSH-based → ใช้ได้เฉพาะ local LAN / VPN** — เสาบน 4G อยู่หลัง CGNAT (SSH เข้าตรงไม่ได้) → ต้องใช้ VPN/RUT200 RMS หรือ MQTT downlink (level 3)

> roadmap ขยาย (versioning + MQTT control plane) + ข้อจำกัด CGNAT ดู [decision-log](../../docs/decision-log.md) `2026-06-25`

## Crontab ที่ติดตั้งบน Pi

```cron
*/5 * * * * /home/pi/smartpole/sync-recordings.sh >> /home/pi/smartpole/sync.log 2>&1
0 */6 * * * /home/pi/smartpole/cleanup-recordings.sh >> /home/pi/smartpole/cleanup.log 2>&1
```

## Crontab ที่ติดตั้งบน DO host

```cron
0 4 * * * /usr/local/bin/smartpole-cleanup-clips.sh >> /var/log/smartpole-cleanup.log 2>&1
```
(script จาก `infra/host-scripts/cleanup-camera-clips.sh`)

## Deploy บน Pi ใหม่ — Automated (~3 นาที)

ใช้ `provision-pi.sh` แทน manual steps:

```bash
# จาก dev machine (มี ssh + scp + plink)
cd infra/pole-firmware

./provision-pi.sh \
  --pole-name pole-02 \
  --install-place "ทางเข้าอาคาร B" \
  --pi-host 192.168.1.148 \
  --pi-pass ABcd12!! \
  --rtsp-ip 192.168.1.109 \
  --rtsp-pass admin-password \
  --has-camera --has-pm25 --has-temp-humidity
```

Script จะทำให้อัตโนมัติ:
1. SSH ไป DO → รัน `backend/scripts/create-pole.ts` สร้างเสาใน DB + gen MQTT credential
2. SCP scripts ทั้งหมดไป Pi
3. sed แทน POLE_NAME, MQTT credentials, RTSP URL ใน scripts
4. Setup SSH key Pi → DO (สำหรับ rsync recordings)
5. Install systemd units (smartpole + smartpole-stream + smartpole-record) + enable
6. Install crontab (sync ทุก 5 นาที + cleanup ตี 3)
7. Verify: HLS endpoint + TCP RTMP + TCP MQTT
8. Print MQTT password (เก็บไว้ — ไม่แสดงอีก)

> Pi venv (`paho-mqtt`, `minimalmodbus`, `pyserial`) ต้อง setup ครั้งแรกบน Pi เอง:
> ```bash
> python3 -m venv /home/pi/smartpole-env
> /home/pi/smartpole-env/bin/pip install paho-mqtt minimalmodbus pyserial
> ```

## Manual deploy (ถ้าจำเป็น)

```bash
# 1. Copy + edit configs
sudo mkdir -p /home/pi/smartpole
sudo cp *.py *.sh /home/pi/smartpole/
sudo chown -R pi:pi /home/pi/smartpole
sudo chmod +x /home/pi/smartpole/*.sh

# 2. Setup Python venv
python3 -m venv /home/pi/smartpole-env
/home/pi/smartpole-env/bin/pip install paho-mqtt minimalmodbus pyserial

# 3. Install systemd units
sudo cp smartpole*.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smartpole smartpole-stream smartpole-record
```

### Configuration ที่ต้องแก้ใน scripts (ถ้า manual)

ใน `main.py`:
- `POLE_NAME` — ตั้งให้ตรงกับชื่อใน DB
- `USERNAME`, `PASSWORD` — MQTT credentials จาก `POST /api/poles`
- `BROKER`, `PORT` — broker endpoint

ใน `stream-rtmp.sh` + `record-mp4.sh`:
- `POLE_NAME` — เหมือนใน main.py
- `RTSP_URL` — IP/credential ของกล้อง Dahua

## Notes

### ทำไม `stream-rtmp.sh` ต้อง inject silent AAC?

กล้อง Dahua sub-stream **ไม่มี audio input** ต่ออยู่ → ถ้าใช้ `-an` (drop audio) SRS จะ insert dummy AAC track ที่ `sample_rate=0, channels=0` → Chrome decode ไม่ได้ → dashboard ค้างที่ loading

แก้ด้วย `-f lavfi -i anullsrc` → silent audio AAC valid → browser เล่นได้

### Sensor (Modbus RTU) ยังไม่ implement

ปัจจุบัน `main.py` ใช้ hardcoded mock values (`pm25=35.2, temp=33.1, hum=74.5`) เพราะ wiring RS485 USB adapter ยังไม่ผ่าน — เมื่อ wiring สำเร็จต้อง replace function `send_sensor()` ให้อ่านจาก Modbus จริง (ใช้ `minimalmodbus` ที่ติดตั้งไว้แล้วใน venv)

ดู register map: [docs/integration/hardware-specs.md § PM2510TH-OD](../../docs/integration/hardware-specs.md)
