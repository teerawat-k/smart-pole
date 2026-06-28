# VPN Solution Design — On-demand WireGuard (Smart Pole)

> ออกแบบ + วิเคราะห์ระบบและซอฟต์แวร์สำหรับ remote maintenance เสาบน 4G (หลัง CGNAT)
> **สถานะ: ออกแบบ (ยังไม่ติดตั้ง)** · companion ของ [vpn-remote-maintenance-security.md](./vpn-remote-maintenance-security.md)

---

## 1. เป้าหมาย + ข้อจำกัด (จากที่ตกลง)

| | |
|---|---|
| **เป้าหมาย** | admin remote SSH เข้าเสาที่อยู่หลัง CGNAT (4G) เพื่อ maintenance/debug |
| **Self-host** | ✅ ไม่พึ่ง third-party/cloud (ไม่ Tailscale/RMS) |
| **ทรัพยากรจำกัด** | ใช้ host เดิม (pilot) — ไม่ซื้อ infra ใหม่ |
| **เทคโนโลยี** | **WireGuard** (เบา, kernel-space, stealth, crypto แข็ง) |
| **โหมด** | **On-demand** — tunnel ปิด default, เปิดผ่าน MQTT, ปิดเองด้วย timer |
| **ความปลอดภัย** | segmented — เสาโดน compromise ลามเข้า production ไม่ได้ |

---

## 2. สถาปัตยกรรม

```
                        MQTT cmd (ผ่านขา outbound เดิมของเสา — ทะลุ CGNAT)
   [Admin laptop] ───────────────────────────────────┐
    WG 10.99.0.2          publish smartpole/pole-01/cmd│
        │ WG (UDP)                                     ▼
        ▼                                          [เสา pole-01]
   ┌─────────────────── DO host ──────────────────┐  - vpn-agent (subscribe cmd)
   │  [WireGuard hub wg0]  10.99.0.1 :51820/udp    │  - wg-maint (on-demand)
   │  [nftables segmentation]                      │◄─WG on-demand──┐
   │  [backend/broker/SRS]  ← wg0 เข้าไม่ถึง (DROP) │   เสา dial ออก  │
   └───────────────────────────────────────────────┘   10.99.0.11 ───┘
```

**Addressing (VPN subnet `10.99.0.0/24` — ไม่ทับ LAN 192.168.x):**
| Role | VPN IP |
|---|---|
| Hub | 10.99.0.1 |
| Admin laptop (bastion) | 10.99.0.2 |
| pole-01 | 10.99.0.11 |
| pole-NN | 10.99.0.(10+NN) |

---

## 3. ซอฟต์แวร์ที่ต้องใช้ (แยกตาม role)

### 3.1 บน DO host (Hub) — มี public IP อยู่แล้ว
| ซอฟต์แวร์ | สถานะ | หน้าที่ |
|---|---|---|
| `wireguard` / `wireguard-tools` | ติดตั้งใหม่ (~MB) | WG server (`wg`, `wg-quick`) |
| WireGuard kernel module | in-kernel (Ubuntu 24.04 / 6.8) | data plane |
| `nftables` | มีอยู่แล้ว | segmentation firewall |
| config `/etc/wireguard/wg0.conf` | สร้างใหม่ | hub key + peer list |

### 3.2 บนเสา (Raspberry Pi)
| ซอฟต์แวร์ | สถานะ | หน้าที่ |
|---|---|---|
| `wireguard-tools` | ติดตั้งใหม่ (~MB) | `wg-quick up/down` |
| WireGuard kernel module | ✅ **verified** — `CONFIG_WIREGUARD=m` + `.ko` มีจริง (โหลดผ่าน root/`wg-quick`) | data plane |
| **`smartpole-vpn-agent`** | **สร้างใหม่** (Python + paho) | ฟัง MQTT cmd → up/down + timer (ดู §4) |
| `smartpole-vpn.service` | สร้างใหม่ | systemd unit ของ agent |
| config `/etc/wireguard/wg-maint.conf` | สร้างใหม่ | pole key + hub endpoint + AllowedIPs |
| `paho-mqtt` | มีอยู่แล้ว | agent reuse |

### 3.3 บนโน้ตบุ๊ก (Admin)
| ซอฟต์แวร์ | หน้าที่ |
|---|---|
| **WireGuard for Windows** (แอป official) | ต่อ laptop เข้า hub |
| config `smart-pole-admin.conf` | admin key + hub endpoint + `AllowedIPs = 10.99.0.0/24` |
| **trigger** — ปุ่ม dashboard (แนะนำ) หรือ `mosquitto_pub` | สั่งเสาเปิด tunnel |
| SSH client | มากับ Windows |

---

## 4. Component ที่ต้องสร้าง: `smartpole-vpn-agent` (เสา)

Service เล็ก แยกจาก main.py (ไม่เสี่ยง sensor publisher) — ฟัง MQTT แล้วคุม WireGuard

```python
# pseudo-logic
subscribe "smartpole/pole-01/cmd"

on_message(payload):
    cmd = json.loads(payload)
    if cmd["action"] == "vpn-open":
        ttl = min(cmd.get("ttl", 1800), MAX_TTL)      # cap เวลา
        run("sudo wg-quick up wg-maint")
        reset_timer(ttl, on_expire=close)             # auto-close
        publish "cmd-result", {"vpn": "up", "expires_in": ttl}
    elif cmd["action"] == "vpn-close":
        close()

def close():
    run("sudo wg-quick down wg-maint")
    publish "cmd-result", {"vpn": "down"}
```
- รันด้วย sudo (เฉพาะ `wg-quick` — ตั้ง sudoers NOPASSWD เฉพาะ 2 คำสั่งนี้)
- **auto-close timer** = กัน tunnel ค้างเปิด (forgotten session)
- validate payload + cap TTL

---

## 5. Control Flow (ลำดับเหตุการณ์)

```
1. Admin: เปิด WireGuard บน laptop            → laptop online 10.99.0.2
2. Admin: กด "เปิด maintenance" (dashboard)   → backend publish smartpole/pole-01/cmd {vpn-open, ttl:1800}
3. เสา agent: รับ cmd → wg-quick up           → เสา dial hub → handshake → online 10.99.0.11
4. เสา agent: set timer 1800s + ack           → smartpole/pole-01/cmd-result {vpn:up}
5. Admin: ssh pi@10.99.0.11                    → ผ่าน hub forward (segmentation อนุญาต) → เข้าเสา
6. Admin: maintenance (SSH คำสั่ง — ไม่ดึงไฟล์ใหญ่ผ่าน 4G)
7. timer ครบ / สั่ง vpn-close                  → wg-quick down → เสา "ล่องหน" + audit log
8. Admin: ปิด WireGuard บน laptop
```

---

## 6. Network & Routing Design (สำคัญ — ไม่ให้กระทบ video/data)

- **AllowedIPs ฝั่งเสา (`wg-maint.conf`)** = `10.99.0.2/32` (admin) เท่านั้น
  → VPN จับเฉพาะ traffic ไป admin · **ไม่ยึด default route** → MQTT/RTMP/rsync/video **ยังวิ่งทางเดิม ไม่ผ่าน VPN**
- **AllowedIPs ฝั่ง admin** = `10.99.0.0/24` → laptop route เฉพาะ subnet VPN เข้า tunnel
- **AllowedIPs ฝั่ง hub ต่อ peer** = `/32` ต่อเสา (anti-spoof + scoping)
- ผลลัพธ์: VPN เป็น "เส้นเสริม" เฉพาะ management — ไม่แตะ data path หลักของเสา

---

## 7. Security / Segmentation (เงื่อนไขบังคับ)

**⚠️ DO host รัน Docker (จัดการ iptables เอง 39 chains) → ห้ามใช้ `nft` policy-drop บน forward hook**
(จะ DROP traffic ของ container ทั้งหมด = Docker networking พัง) → ใช้ **`DOCKER-USER` chain** ที่ Docker รับประกันว่ารัน **ก่อน** rule ของมัน และแตะเฉพาะ `wg0`:

```bash
# ── DO host (hub co-located กับ Docker) — Docker-safe ──
# 1) wg peers เข้าถึง service ของ host เองไม่ได้ (backend/broker/DB ที่ localhost)
#    หมายเหตุ: WireGuard handshake เข้ามาทาง eth0:51820 (ไม่ใช่ wg0) → กฎนี้ไม่กระทบ handshake
iptables -A INPUT -i wg0 -j DROP

# 2) forward: อนุญาตแค่ เสา↔admin (ลงใน DOCKER-USER → รันก่อน Docker, แตะเฉพาะ wg0)
iptables -I DOCKER-USER -i wg0 -j DROP                                  # (จบล่างสุดของกลุ่ม)
iptables -I DOCKER-USER -i wg0 -s 10.99.0.2  -d 10.99.0.0/24 -j ACCEPT  # admin→เสา (อยู่บน DROP)
iptables -I DOCKER-USER -i wg0 -s 10.99.0.11 -d 10.99.0.2    -j ACCEPT  # เสา→admin (อยู่บนสุด)
# → traffic ที่ไม่ใช่ wg0 ผ่าน DOCKER-USER ไปให้ Docker จัดการตามปกติ (ไม่แตะ container networking)
# Ubuntu 24.04 = iptables-nft → กฎเหล่านี้เขียนลง nftables เบื้องหลัง coexist กับ Docker ได้
```
> **ต้อง test:** หลังใส่กฎ → ยืนยัน (ก) container ทุกตัวยังทำงาน (backend/broker/SRS) (ข) เสาบน VPN ปิง backend/broker **ไม่ได้** (ค) admin ↔ เสา ได้
```bash
# nftables บนเสา — รับ SSH ผ่าน VPN เฉพาะจาก admin
nft add rule inet filter input iifname "wg-maint" ip saddr 10.99.0.2 tcp dport 22 accept
nft add rule inet filter input iifname "wg-maint" drop
```
+ per-pole key, key file 600, MQTT ACL (เฉพาะ backend publish `cmd` ได้) — ดู [security checklist](./vpn-remote-maintenance-security.md)

---

## 8. Backend Integration (control plane)

| ระดับ | ทำอะไร | งาน |
|---|---|---|
| **Minimal (pilot)** | admin รัน `mosquitto_pub` ตรง (มี admin MQTT creds + ACL) → ไม่แก้ backend | 0 |
| **แนะนำ (production)** | `POST /api/poles/:id/maintenance-tunnel` → publish cmd + **audit log** + RBAC + (option) track state | module `srs/`-style เล็ก (~half day) |

> on-demand VPN **พึ่ง MQTT cmd topic** = ตัวเดียวกับ MQTT control plane (P2-4 level 3) → ทำครั้งเดียวใช้ได้ทั้ง VPN + on-demand live

---

## 9. Resource Footprint (วิเคราะห์)

| ทรัพยากร | Hub (DO) | เสา (Pi) | Laptop |
|---|---|---|---|
| Disk | ~MB | ~1-3 MB | แอป WG ~MB |
| RAM idle | ~0 (kernel) | agent ~few MB | — |
| CPU idle | ~0 | ~0 | — |
| CPU active | crypto จิ๋ว (SSH-level) | ~1-2% core | — |
| **4G data** | — | **idle ~0** · session = MB-scale เฉพาะตอนใช้ | — |
| **กระทบ video** | — | **ไม่** (idle) · session SSH = ไม่ · ดึงไฟล์ใหญ่ = เลี่ยง (24x7 live แชร์ uplink) | — |

→ **เบามาก** ทุก role · ตัวที่กิน uplink จริงคือ live 24x7 เอง ไม่ใช่ VPN

---

## 10. Implementation Phases (เมื่อสั่งทำ)

| Phase | งาน | สถานะ |
|---|---|---|
| 0 | verify ความพร้อม — ดูผลด้านล่าง | ✅ เสร็จ 2026-06-28 |
| 1 | **MQTT control plane** — เสา subscribe `cmd` topic + ack | ✅ agent subscribe `smartpole/pole-01/cmd` + ack `cmd-result` |
| 2 | Hub: WG server + **segmentation** (host, DOCKER-USER) | ✅ `wg0` up 10.99.0.1 + enabled boot + 6 containers healthy |
| 3 | เสา: `wg-maint.conf` + `smartpole-vpn-agent` + sudoers | ✅ deploy + `smartpole-vpn.service` active (NOPASSWD wg-quick) |
| 4 | Admin: WG client + trigger | ✅ template + `vpn-trigger.py` (admin laptop = user รันเอง) |
| 5 | (option) backend trigger endpoint + audit | ⏳ แนะนำสำหรับ production (ดู §8) |
| 6 | **Test** full flow + segmentation + auto-close | ✅ ครบ — ดู "ผล implement" ด้านล่าง |

### Phase 0 — ผลการ verify ความพร้อม (2026-06-28)

| | Pi (เสา) | Host (DO) |
|---|---|---|
| Kernel | 6.12.93+rpt-rpi-2712 | 6.8.0-31 (Ubuntu 24.04 LTS) |
| **WireGuard module** | ✅ `CONFIG_WIREGUARD=m` + `.ko` มีจริง | ✅ `CONFIG_WIREGUARD=m` |
| wireguard-tools | ต้องลง (apt `1.0.20210914`) | ต้องลง (apt available) |
| nftables / iptables | ต้องลง `nftables` | ✅ มีทั้งคู่ |
| IP forwarding | (ไม่ต้องบนเสา) | ✅ เปิดอยู่แล้ว (`=1`) |
| UDP 51820 (hub port) | — | ✅ ว่าง |
| Public IP | (หลัง CGNAT — dial ออก) | ✅ 152.42.242.162 |
| Resource | ✅ RAM ว่าง 3.3GB · disk ว่าง 17GB | ✅ |
| paho-mqtt (agent) | ✅ 2.1.0 | — |
| ⚠️ Firewall | (ไม่มี Docker — ใช้ nft ตรง) | **Docker จัดการ iptables (39 chains)** → ใช้ `DOCKER-USER` (§7) |

**สรุป:** ทั้งสองเครื่อง **พร้อม ไม่มี blocker** · ต้องลงแค่ `wireguard-tools` (+ `nftables` บนเสา) · จุดระวังเดียว = **firewall บน host ที่มี Docker** → ใช้ `DOCKER-USER` chain + test 3 ข้อ (§7)

> *แก้ความเข้าใจผิดเดิม:* "modinfo ไม่เจอ wireguard" = PATH ของ user `pi` ไม่มี `modprobe`/`modinfo` (อยู่ `/usr/sbin`) — **module มีจริง** โหลดผ่าน root/`wg-quick` ได้

### Phase 1–6 — ผลการ implement + verify (2026-06-28)

**สิ่งที่ deploy จริง:**
- **Hub (host):** `/etc/wireguard/wg0.conf` (10.99.0.1/24, UDP 51820) + segmentation ผ่าน `DOCKER-USER` + `INPUT` (PostUp/PostDown) · `wg-quick up wg0` + `systemctl enable wg-quick@wg0` (boot) · **6 smart-pole containers healthy + backend `/health/ready` READY** (production ไม่กระทบ)
- **เสา (Pi):** `/etc/wireguard/wg-maint.conf` (10.99.0.11/24, **down by default = on-demand**, AllowedIPs=10.99.0.0/24 ไม่ยึด default route) · `smartpole-vpn-agent.py` + `smartpole-vpn.service` (active) · sudoers NOPASSWD เฉพาะ `wg-quick up/down wg-maint`
- **Admin:** `admin-wg.conf.example` + `vpn-trigger.py` (template — รันบน laptop)

**ผล test (ครบ):**
| Test | ผล |
|---|---|
| publish `vpn-open` → agent → `wg-quick up` | ✅ NOPASSWD ผ่าน · **handshake กับ hub สำเร็จ** · เสาได้ IP 10.99.0.11 |
| `vpn-close` + auto-close timer (ttl) | ✅ tunnel down · interface หาย = ไม่มี inbound path |
| **Segmentation:** เสาบน VPN → host `10.99.0.1` (ping) | ✅ **100% loss (บล็อก)** — INPUT wg0 drop |
| **Segmentation:** เสาบน VPN → backend `10.99.0.1:7766` | ✅ **timeout (บล็อก)** — exit 28 |
| เส้นทางปกติ (4G live/MQTT) ระหว่าง tunnel up | ✅ main.py publish `seq ok` ต่อเนื่อง (ไม่กระทบ) |

> **บทเรียนสำคัญ (cred):** ตอน implement พบว่า broker ใช้ `allow_anonymous false` + ACL `pattern smartpole/%u/#` → **เสาต้อง auth ด้วย username = `pole-01`** (ไม่ใช่ `smartpole` ที่ repo เคยตั้ง) · main.py/agent แก้เป็น `pole-01` แล้ว + reset password ใน broker passwordfile (host bind-mount แบบ `ro` → ต้องแก้ที่ host path + `docker kill -s HUP`). ดู [decision-log](./decision-log.md)

**ค้างไว้ (production hardening, ไม่บังคับสำหรับ pilot):**
- Phase 5: สั่ง `vpn-open` ผ่าน **backend endpoint (authenticated + audit log)** แทน publish ตรง — ตอนนี้ topic `cmd` พึ่ง broker auth (ผู้มี cred `pole-01`/`backend-subscriber` publish ได้) · ความเสี่ยงตกค้าง = toggle tunnel เท่านั้น (เข้าเสาไม่ได้ถ้าไม่มี admin WG key)
- Pole endpoint firewall (§7 nft รับ SSH เฉพาะ admin บน wg-maint) — defense-in-depth เพิ่มเติม (segmentation บน hub กันชั้นหลักแล้ว)

---

## 11. Dependencies & Risks

**Dependencies:**
- MQTT broker (มี) + `cmd` topic handling บนเสา (สร้าง)
- WireGuard kernel module (verify บน Pi)
- การ provision: เพิ่มขั้น gen WG key + ลง agent ใน `provision-pi.sh`/`migrate-pi.sh` (เสาใหม่ได้อัตโนมัติ)

**Risks + mitigation:**
| Risk | mitigation |
|---|---|
| **hub co-located + Docker จัดการ iptables** → กฎ segmentation ถูก Docker ข้าม หรือไปทับจน Docker พัง | **ใช้ `DOCKER-USER` chain** (§7) แตะเฉพาะ `wg0` + **test 3 ข้อ** (container ทำงาน / เสาเข้า production ไม่ได้ / admin↔เสา ได้) + ย้าย VPS เมื่อ scale |
| tunnel ค้างเปิด | auto-close timer (cap TTL) |
| heavy transfer แย่ง live uplink (live 24x7) | ไม่ดึงไฟล์ใหญ่จากเสา (ดึง recording จาก host) |
| key เสาหลุด (physical) | per-pole key + segmentation (ลามไม่ได้) + revoke |
| ~~Pi WireGuard module ไม่มี~~ | ✅ **verified แล้ว** (Phase 0) — module มีจริง |

---

## 12. สรุป

ระบบ = **WireGuard on-demand, self-hosted, hub co-located + segmented** ที่:
- **ใช้ของเดิมเป็นหลัก** (host, MQTT, paho) + เพิ่มแค่ `wireguard-tools` + **1 agent ใหม่บนเสา**
- **เบามาก** (data idle ~0, ไม่กระทบ video)
- **ปลอดภัย** ด้วย segmentation (firewall) + on-demand + per-pole key
- **พึ่ง MQTT control plane** (ทำร่วม on-demand live ได้)

> ✅ **ติดตั้ง + verified แล้ว (2026-06-28)** — Phase 0–4,6 เสร็จ · hub up + segmentation พิสูจน์แล้ว (เสา compromise เข้า production ไม่ได้) · on-demand agent ทำงานครบ (open/close/auto-close) · เหลือ Phase 5 (backend trigger) เป็น production hardening ทางเลือก
