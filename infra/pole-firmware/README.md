# Pole Firmware

ไฟล์ที่รันบน Raspberry Pi (ต่อกล้อง + sensor) — เก็บ versioning ใน repo เพื่อ rollback ได้

## ไฟล์

| File | หน้าที่ | Pi path |
|---|---|---|
| `main.py` | MQTT publisher — ส่ง sensor data ทุก 5 นาที | `/home/pi/smartpole/main.py` |
| `stream-rtmp.sh` | ffmpeg push RTSP กล้อง → RTMP SRS (24/7) | `/home/pi/smartpole/stream-rtmp.sh` |
| `smartpole.service` | systemd unit สำหรับ `main.py` | `/etc/systemd/system/smartpole.service` |
| `smartpole-stream.service` | systemd unit สำหรับ `stream-rtmp.sh` | `/etc/systemd/system/smartpole-stream.service` |

## Deploy บน Pi ใหม่

```bash
# 1. Copy ไฟล์
sudo mkdir -p /home/pi/smartpole
sudo cp main.py stream-rtmp.sh /home/pi/smartpole/
sudo chown -R pi:pi /home/pi/smartpole
sudo chmod +x /home/pi/smartpole/stream-rtmp.sh

# 2. Setup Python venv (ครั้งแรกเท่านั้น)
python3 -m venv /home/pi/smartpole-env
/home/pi/smartpole-env/bin/pip install paho-mqtt minimalmodbus pyserial

# 3. Install systemd units
sudo cp smartpole.service smartpole-stream.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smartpole smartpole-stream
sudo systemctl status smartpole smartpole-stream
```

## Configuration ที่ต้องแก้ก่อน deploy

ใน `main.py`:
- `POLE_NAME` — ตั้งให้ตรงกับชื่อใน DB (เช่น `pole-02`, `pole-03`)
- `USERNAME`, `PASSWORD` — MQTT credentials จาก backend (`POST /api/poles` หรือ `regenerate-credential`)
- `BROKER`, `PORT` — broker endpoint (production: `152.42.242.162:7783` UAT)

ใน `stream-rtmp.sh`:
- `POLE_NAME` — เหมือนใน main.py
- `RTSP_URL` — IP/credential ของกล้อง Dahua (อ่าน [docs/integration/hardware-specs.md](../../docs/integration/hardware-specs.md))
- `RTMP_URL` — SRS endpoint

## Notes

### ทำไม `stream-rtmp.sh` ต้อง inject silent AAC?

กล้อง Dahua sub-stream **ไม่มี audio input** ต่ออยู่ → ถ้าใช้ `-an` (drop audio) SRS จะ insert dummy AAC track ที่ `sample_rate=0, channels=0` → Chrome decode ไม่ได้ → dashboard ค้างที่ loading

แก้ด้วย `-f lavfi -i anullsrc` → silent audio AAC valid → browser เล่นได้

### Sensor (Modbus RTU) ยังไม่ implement

ปัจจุบัน `main.py` ใช้ hardcoded mock values (`pm25=35.2, temp=33.1, hum=74.5`) เพราะ wiring RS485 USB adapter ยังไม่ผ่าน — เมื่อ wiring สำเร็จต้อง replace function `send_sensor()` ให้อ่านจาก Modbus จริง (ใช้ `minimalmodbus` ที่ติดตั้งไว้แล้วใน venv)

ดู register map: [docs/integration/hardware-specs.md § PM2510TH-OD](../../docs/integration/hardware-specs.md)
