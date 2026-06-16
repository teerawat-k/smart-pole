# Pi Migration Runbook — Pi 4 → Pi 5 (pole-01)

> สรุปจาก plan ที่วางไว้ — ใช้ tick box ระหว่างทำจริง  
> เป้าหมาย: replace hardware ของ pole-01 จาก Pi 4 → Pi 5 (4GB / 32GB) — เสาเดียวกัน DB record + MQTT credentials เก็บไว้

## ⏱️ เวลาประมาณ: 60-90 นาที (downtime ช่วง swap จริง ~15 นาที)

---

## 📦 Phase 0 — เตรียมของก่อน (off-site, ทำที่โต๊ะ)

```
[ ] Pi 5 board (4GB)
[ ] Active cooler / heatsink + fan
[ ] SDcard 32GB (class A2 หรือ A1)
[ ] USB-C PD adapter 5V/5A
[ ] Card reader (สำหรับ flash OS)
[ ] HDMI cable (debug ถ้าจำเป็น)
[ ] (ไม่บังคับ) keyboard + mouse + monitor
```

---

## 🛠️ Phase A — Flash + first boot Pi 5 (15 นาที)

### A.1 Flash OS

```
[ ] เปิด Raspberry Pi Imager บน dev machine (Windows/Mac/Linux)
[ ] เลือก device: Raspberry Pi 5
[ ] เลือก OS: Raspberry Pi OS Lite (64-bit) — Bookworm
[ ] เลือก storage: SDcard 32GB
[ ] กด Gear icon (Settings) — ตั้งค่าก่อน flash:
    [ ] Hostname:    pole-001
    [ ] Username:    pi
    [ ] Password:    ABcd12!!     ← เดียวกับ Pi 4 (สำคัญ — migrate-pi.sh ใช้)
    [ ] Wi-Fi:       SSID + PSK   (ข้ามถ้าใช้ ethernet)
    [ ] Locale:      Asia/Bangkok
    [ ] Enable SSH:  ✓ (password auth)
[ ] กด Save → Yes → flash (~5 นาที)
[ ] Eject SD card
```

### A.2 First boot

```
[ ] Insert SDcard ใน Pi 5
[ ] เชื่อม ethernet (ถ้าไม่ใช้ wifi)
[ ] ⚠️ ยังไม่เสียบ USB-RS485 + กล้อง — เสียบทีหลังตอน Phase C
[ ] เสียบ Power 5V/5A USB-C PD
[ ] รอ boot 2-3 นาที (LED status เต้นจังหวะ heartbeat)
[ ] ตรวจ Pi 5 ขึ้น network — ping 192.168.1.147
       ⚠️ ถ้าไม่เจอ IP เดิม → router DHCP ให้ IP ใหม่ตาม MAC ใหม่
       → ทำหนึ่งใน:
         (a) Reserve IP ของ MAC Pi 5 → 192.168.1.147 ใน router admin
         (b) หา IP ใหม่จาก router DHCP list → ใช้ IP ใหม่
[ ] SSH ทดสอบ:
       ssh pi@192.168.1.147
       → ใช้ password ABcd12!!
       → verify: cat /proc/device-tree/model
         (ควรเห็น "Raspberry Pi 5 Model B Rev x.x")
[ ] exit ออก
```

---

## 🚀 Phase B — Run migrate-pi.sh (ขณะ Pi 4 ยังทำงาน, 10 นาที)

> ⚠️ **อย่าหยุด Pi 4** ตอนนี้ — สลับเอาจริงตอน Phase C

### B.1 Pull latest scripts

```bash
cd C:/BuffProjectDev/smart-pole
git pull origin uat-dev   # ดึง migrate-pi.sh ใหม่
```

### B.2 Run migrate-pi.sh

```bash
cd infra/pole-firmware
chmod +x migrate-pi.sh    # ถ้ารัน Git Bash บน Windows

./migrate-pi.sh \
  --pole-name pole-01 \
  --pi-host 192.168.1.147 \
  --pi-pass 'ABcd12!!' \
  --rtsp-ip 192.168.1.108 \
  --rtsp-pass '!@34ZXcv'
```

### B.3 ตรวจ output

```
[ ] [0/7] SSH connected — Raspberry Pi 5 Model B ✓
[ ] [1/7] apt install successful (~3 นาที)
[ ] [2/7] Python venv created + paho-mqtt/minimalmodbus/pyserial installed
[ ] [3/7] 6 firmware files copied
[ ] [4/7] RTSP URL patched
[ ] [5/7] Pi 5 → DO SSH key setup (echo "OK from Pi: pole-001")
[ ] [6/7] systemd active active active + crontab พ้อม
[ ] [7/7] HLS: HTTP 200 + RTMP: 1 + MQTT: 1
[ ] Pi 5 publishing MQTT ปกติ → ตรวจ DB:
    ssh root@152.42.242.162 'sudo -u postgres psql -d smart_pole -c "
      SELECT \"poleStatus\", \"latestHumidity\", \"latestPm25\" 
      FROM \"Pole\" WHERE \"poleName\"='\''pole-01'\'';"'
    → status=online + ค่าใหม่
```

> 🎯 **ที่จุดนี้ Pi 5 ทำงาน parallel กับ Pi 4** — broker จะรับ 2 connections จากชื่อ user เดียวกัน  
> mosquitto จะ disconnect connection เก่า (Pi 4) เอง — ปกติของ MQTT same client_id behavior

---

## 🔌 Phase C — Hardware Swap (10 นาที downtime)

### C.1 Photo + Backup

```
[ ] ถ่ายรูป Pi 4 connections ตอนนี้ (สายทุกเส้นพร้อม label)
[ ] บันทึก IP MAC ของ Pi 4 (เผื่อต้อง rollback)
    ssh pi@<Pi-4-IP> 'ip link show eth0 | grep ether'
```

### C.2 Graceful shutdown Pi 4

```bash
ssh pi@<Pi-4-IP>   # IP ของ Pi 4
echo "ABcd12!!" | sudo -S systemctl stop smartpole smartpole-stream smartpole-record
echo "ABcd12!!" | sudo -S shutdown -h now
exit
```

```
[ ] รอ Pi 4 ดับจริง (~30s)
    LED ACT (เขียว) ดับ → power off ได้
[ ] ดึงสาย Power ของ Pi 4
[ ] ดึงสาย Ethernet ของ Pi 4
[ ] ดึงสาย USB-RS485 ออกจาก Pi 4
```

### C.3 Move USB-RS485 + connect Pi 5

```
[ ] เสียบ USB-RS485 → Pi 5 (USB 3.0 port ก็ได้)
[ ] เสียบ Ethernet (ถ้าใช้)
[ ] เสียบ Power 5V/5A PD → Pi 5
[ ] รอ Pi 5 boot 60s
[ ] ตรวจ LED status (กระพริบ heartbeat ปกติ)
```

### C.4 Verify

```bash
# จาก dev machine
ssh pi@192.168.1.147   # IP ของ Pi 5

# 1. Services ทำงาน
sudo systemctl is-active smartpole smartpole-stream smartpole-record
# Expected: active active active

# 2. Sensor /dev/ttyUSB0 ขึ้น
ls -la /dev/ttyUSB*
# Expected: /dev/ttyUSB0 owned by root:plugdev

# 3. Sensor read ทดสอบ
/home/pi/smartpole-env/bin/python3 -c "
import sys; sys.path.insert(0, '/home/pi/smartpole')
from sensor import PM2510Sensor
r = PM2510Sensor().read()
print('Outcome:', r.outcome, '-- data:', r.data)
"
# Expected: Outcome: ok -- data: {humidity, temperature, pm1, pm25, pm10}

# 4. MQTT log
sudo journalctl -u smartpole -n 5 --no-pager
# Expected: "seq=N ok — H=... T=... PM2.5=..."

exit
```

```
[ ] All checks ผ่าน → Phase D
[ ] ถ้าไม่ผ่าน → ดู Rollback Plan ด้านล่าง
```

---

## ✅ Phase D — End-to-end Verification (10 นาที)

### D.1 Backend DB

```bash
ssh root@152.42.242.162 'sudo -u postgres psql -d smart_pole -c "
  SELECT \"poleName\", \"poleStatus\", \"latestHumidity\", \"latestPm25\", \"latestTemperature\",
    to_char(\"latestReadingAt\"/1000 * interval '\''1 second'\'' + timestamp '\''1970-01-01'\''+ interval '\''7 hours'\'',
      '\''HH24:MI:SS'\'') AS t
  FROM \"Pole\" WHERE \"poleName\"='\''pole-01'\'';"'
```

```
[ ] poleStatus = online
[ ] latestReadingAt = ตอนนี้ (within 60s)
[ ] Values valid (humidity 40-80%, temp 25-35°C)
```

### D.2 HLS live stream

```bash
curl -sk https://152.42.242.162/hls/live/pole-01.m3u8 | head -5
```

```
[ ] เห็น #EXTM3U + #EXT-X-VERSION:3
[ ] Browser https://152.42.242.162/dashboard → เสาแสดง live video
```

### D.3 DVR recording

```bash
ssh pi@192.168.1.147 'ls -la /home/pi/smartpole/recordings/pole-01/$(date +%Y-%m-%d)/'
```

```
[ ] มี mp4 file ใหม่ ขนาดโตขึ้น
```

### D.4 Auto-resolve alert

```bash
ssh root@152.42.242.162 'sudo -u postgres psql -d smart_pole -c "
  SELECT id, \"alertType\", \"isResolved\", \"resolvedNote\"
  FROM \"Alert\" WHERE \"poleId\"=1 AND \"alertType\"='\''pole_offline'\''
  ORDER BY id DESC LIMIT 2;"'
```

```
[ ] Alert ล่าสุด (ที่เกิดตอน Pi 4 ดับ + Phase C) — isResolved=true
[ ] resolvedNote = "auto-resolved by system"
```

### D.5 Grafana monitoring

```
[ ] ดู Grafana panel: sensor_reads_total{pole=pole-01, outcome=ok} เพิ่ม
[ ] ดู MQTT messages/sec panel — เห็น spike กลับมา
[ ] อุณหภูมิ Pi 5 < 70°C (vcgencmd measure_temp)
```

---

## 🔄 Rollback Plan (ถ้า Phase C-D ล้มเหลว ภายใน 30 นาที)

```bash
# 1. Power off Pi 5
ssh pi@192.168.1.147 'echo "ABcd12!!" | sudo -S shutdown -h now'

# 2. ถอด:
#    - USB-RS485
#    - Camera ethernet
#    - Power adapter

# 3. เสียบ Pi 4 กลับ
#    - USB-RS485 → Pi 4
#    - Ethernet → Pi 4
#    - Power 5V/3A → Pi 4

# 4. รอ Pi 4 boot 60s

# 5. ssh pi@<Pi-4-IP>
#    sudo systemctl start smartpole smartpole-stream smartpole-record

# 6. ตรวจ:
#    ssh root@152.42.242.162 'sudo -u postgres psql -d smart_pole -c "
#      SELECT \"poleStatus\" FROM \"Pole\" WHERE \"poleName\"='\''pole-01'\'';"'
#    → ควร = online
```

⚠️ **Pi 4 SDcard ห้ามฟอร์แมต** จนกว่า Pi 5 stable 24-48 ชม.

---

## 🧹 Phase E — Post-migration cleanup (24h หลัง stable)

```
[ ] Pi 5 ทำงานเสถียรครบ 24 ชม.
[ ] เช็ค sensor_reads_total เพิ่มต่อเนื่อง (ไม่มี gap)
[ ] เช็ค disk usage Pi 5 — recordings โตขึ้นปกติ
[ ] เช็ค CPU + temp Pi 5 ปกติ (อุณหภูมิ < 70°C ในห้องปกติ)
[ ] (Optional) Image SDcard ของ Pi 4 เก็บ backup
[ ] Wipe SDcard Pi 4 → reuse สำหรับเสาถัดไป
```

---

## 🎁 Phase F — Bonus tweaks (optional, ถ้ามีเวลา)

```
[ ] เพิ่ม sensor poll interval 60s → 30s ใน main.py SENSOR_INTERVAL
[ ] เพิ่ม ffmpeg preset veryfast → fast ใน stream-rtmp.sh (Pi 5 มี CPU เหลือ)
[ ] เพิ่ม monitoring อุณหภูมิ Pi: cron publish vcgencmd measure_temp ไป /health
[ ] เปิด swap = 0 (RAM 4GB เหลือเฟือ) ลดการ wear SDcard
    sudo dphys-swapfile swapoff
    sudo systemctl disable dphys-swapfile
```

---

## 📞 Emergency Contacts

- Pi 4 backup: ห้ามฟอร์แมต SDcard
- DB backup: `/tmp/pre-migration-YYYYMMDD.sql` บน DO host
- Backend log: `docker logs smart-pole-backend` บน DO

---

**Last updated:** ก่อน migration day  
**Test verified:** auto-resolve alert, audit log, HLS recovery — ดู E2E test report ใน git history
