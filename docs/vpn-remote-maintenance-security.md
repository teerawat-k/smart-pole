# VPN Remote Maintenance — Security Checklist (Smart Pole)

> เอกสารพิจารณา/แนวทางความปลอดภัยสำหรับ "VPN บนเสา" เพื่อ remote maintenance (เสาบน 4G หลัง CGNAT)
> **สถานะ: พิจารณา (ยังไม่ติดตั้ง)** — ดู [decision-log `4G/CGNAT`](./decision-log.md) + `production-readiness P2-4`
> ตัวเลือกที่แนะนำ: **WireGuard, on-demand, segmented** (เบาสุด + ปลอดภัยสุด — ดู resource/security analysis)

---

## 0. หลักการ (อ่านก่อน)

> **ภัยจริง = เสาเป็นอุปกรณ์กลางแจ้งไร้คนเฝ้า** (ขโมย/งัด/ดึง SD → ได้ private key)
> คำถามตัดสิน: **"เสา 1 ต้นโดน compromise แล้ว ลามเข้า host/production/เสาอื่นได้ไหม?"**
> ออกแบบให้ "ลามไม่ได้" = ปลอดภัยพอ · รับประกันไม่ได้ = **อย่าทำ ใช้ on-site maintenance แทน**

---

## A. Pre-decision Gate — ต้องผ่านครบก่อนตัดสินใจทำ

- [ ] **มี host แยกสำหรับ VPN hub** (ไม่ใช่เครื่อง production ที่รัน backend/broker/DB)
  - *ทำไม:* hub เป็น service inbound ใหม่ — ถ้าวางบน production แล้ว hub แตก = production แตกทั้งหมด
- [ ] **ทำ network segmentation (firewall) บน hub ได้** (มีสิทธิ์ + ความรู้ตั้ง nftables/iptables)
  - *ทำไม:* segmentation คือสิ่งที่กัน "เสาโดน → ลาม" — หัวใจของทั้งหมด
- [ ] **มีกระบวนการดูแล key** (gen/rotate/revoke per-pole)
- [ ] **เลือก self-hosted** (WireGuard/Headscale) ไม่ใช่ vendor cloud ถ้าซีเรียส trust boundary

> ❌ ถ้าข้อใดข้อหนึ่งทำไม่ได้ → **ไม่ติดตั้ง VPN** ใช้ on-site / นำเสากลับ local network ตอน maintenance

---

## B. WireGuard Hub (Server) — ตั้งบน host แยก

- [ ] **วาง hub บน host แยก/isolated** จาก production (VM แยก หรือ container + firewall เข้ม)
- [ ] **เปิดเฉพาะ UDP port เดียว** (เช่น 51820) — WireGuard ไม่ตอบ packet ที่ไม่มี valid key → port "ล่องหน" ต่อ scanner
- [ ] **hub เก็บแค่ public key ของเสา** — private key อยู่บน Pi เท่านั้น (hub ไม่เคยเห็น)
- [ ] **ปิด IP forwarding ที่ไม่จำเป็น** — เปิด forward เฉพาะ path ที่ segmentation อนุญาต
- [ ] hub OS hardened: SSH key-only, auto-update security patch, ไม่มี service เกินจำเป็น

```ini
# /etc/wireguard/wg0.conf (hub) — ตัวอย่าง
[Interface]
Address    = 10.99.0.1/24
ListenPort = 51820
PrivateKey = <hub-private-key>
# ห้าม route เสาไป production — บังคับด้วย firewall (ดู section D)

[Peer]                          # pole-01
PublicKey  = <pole-01-public-key>
AllowedIPs = 10.99.0.11/32      # /32 ต่อเสา = anti-spoof + scoping (เสานี้ใช้ได้ IP เดียว)

[Peer]                          # pole-02
PublicKey  = <pole-02-public-key>
AllowedIPs = 10.99.0.12/32
```

---

## C. Per-pole Key Management

- [ ] **gen key ต่อเสา (unique)** — `wg genkey | tee privatekey | wg pubkey > publickey`
- [ ] **private key อยู่บน Pi เท่านั้น** — perms `600`, owner root (หรือ user ที่รัน wg)
  - `chmod 600 /etc/wireguard/wg0.conf` (มี private key อยู่ในนั้น)
- [ ] **AllowedIPs /32 ต่อ peer บน hub** — เสาแต่ละต้นมี VPN IP เฉพาะตัว ปลอมเป็นเสาอื่นไม่ได้
- [ ] **revocation procedure** พร้อมใช้: ลบ `[Peer]` ของเสาออกจาก hub config + `wg syncconf` → ตัดทันที (เสาอื่นไม่กระทบ)
- [ ] **rotation schedule** — หมุน key ทุก ~6-12 เดือน หรือเมื่อสงสัย compromise
- [ ] **ห้าม reuse key** ข้ามเสา — โดน 1 ต้น = revoke 1 key

---

## D. Segmentation — หัวใจความปลอดภัย (ต้องเข้ม)

- [ ] **เสาเข้าถึงได้แค่ bastion/management IP เท่านั้น** — ห้าม production (backend/broker/DB)
- [ ] **ห้ามเสา ↔ เสา** (เสาคุยกันเองไม่ได้ — กัน lateral movement)
- [ ] **default DROP** ใน forward chain — allow เฉพาะที่จำเป็น (whitelist)
- [ ] firewall บน hub บังคับ ไม่ใช่พึ่ง AllowedIPs อย่างเดียว

```bash
# nftables บน hub — เสา(10.99.0.0/24) เข้าได้แค่ bastion 10.99.0.2, ห้ามอื่น
table inet wg_seg {
  chain forward {
    type filter hook forward priority 0; policy drop;   # default DROP
    # อนุญาต: เสา → bastion (management) เท่านั้น
    iifname "wg0" ip saddr 10.99.0.0/24 ip daddr 10.99.0.2 accept
    # อนุญาต: bastion → เสา (admin SSH กลับเข้าเสา)
    iifname "wg0" ip saddr 10.99.0.2 ip daddr 10.99.0.0/24 accept
    # return traffic
    ct state established,related accept
    # ที่เหลือ (เสา→เสา, เสา→production) = DROP (policy)
  }
}
```
> ผลลัพธ์: ถ้าเสาโดน compromise → ดึง key → join VPN ได้ **แต่ทำได้แค่คุยกับ bastion** ลามต่อไม่ได้

---

## E. On-demand (แนะนำ — ปลอดภัยสุด + data ~0)

- [ ] **tunnel ขึ้นเฉพาะเมื่อได้รับคำสั่ง maintenance** (ผ่าน MQTT downlink ที่ authenticate แล้ว)
- [ ] **time-boxed + auto-close** (เช่น 30-60 นาที แล้ว `wg-quick down` อัตโนมัติ)
- [ ] **audit log ทุกครั้งที่เปิด** (ใคร/เมื่อไหร่/เสาไหน) — เก็บที่ host
- [ ] **ไม่ตั้ง PersistentKeepalive** (on-demand ไม่ต้องการ idle traffic → data ~0 + ไม่มี persistent path)
- [ ] คำสั่งเปิดต้องมาจาก source ที่เชื่อถือ (backend authenticated) — ไม่ใช่ topic ที่ใครก็ publish ได้

> ปกติเสา **ไม่มี inbound path เลย** = attack surface ~0 · เปิดเฉพาะช่วง authorize + logged

---

## F. Pole Endpoint Hardening (ตัวเสาเอง)

- [ ] **SSH key-only** (PasswordAuthentication no) — มีอยู่แล้ว ([security-hardening.md](./security-hardening.md))
- [ ] **WireGuard interface firewall** — รับ SSH (22) เฉพาะจาก bastion IP บน wg interface เท่านั้น
  ```bash
  # บน Pi — รับ SSH ผ่าน VPN เฉพาะจาก bastion
  nft add rule inet filter input iifname "wg0" ip saddr 10.99.0.2 tcp dport 22 accept
  nft add rule inet filter input iifname "wg0" drop   # ที่เหลือบน wg = drop
  ```
- [ ] **ไม่เปิด service เกินจำเป็นบน VPN interface** (เฉพาะ SSH สำหรับ maintenance)
- [ ] private key file perms 600 + owner ถูกต้อง
- [ ] ถือว่า field device = **semi-trusted** → segment ให้ค่า key จำกัด

---

## G. Monitoring & Audit

- [ ] **เฝ้า handshake / last-seen ต่อ peer** — `wg show` (latest handshake) → ตรวจ peer ที่หาย/ผิดปกติ
- [ ] **alert เมื่อมี peer/handshake ผิดปกติ** (เสาที่ควร offline แต่มี handshake = สงสัย)
- [ ] **audit ทุกการเปิด on-demand tunnel** (logged ที่ host)
- [ ] log การ SSH เข้าเสาผ่าน VPN (who/when)
- [ ] (option) ส่ง VPN status เข้า Grafana/Prometheus ที่มีอยู่

---

## H. Incident Response (เสาหาย/โดน compromise)

- [ ] **revoke key ทันที** — ลบ `[Peer]` ของเสาออกจาก hub + `wg syncconf wg0 <(wg-quick strip wg0)` → ตัดการเข้าถึง
- [ ] segmentation จำกัด blast radius อยู่แล้ว (เสาโดน = แค่ถึง bastion ไม่ถึง production)
- [ ] ถ้าสงสัย hub โดน → rotate key ทุกเสา + ตรวจ host แยก
- [ ] บันทึก incident + review

---

## สรุปลำดับความสำคัญ (ถ้าทำ)

| ระดับ | ต้องมี |
|---|---|
| **ขั้นต่ำ (ห้ามขาด)** | A (gate) + B (hub แยก) + C (per-pole key) + **D (segmentation)** |
| **แนะนำ** | E (on-demand) — ปลอดภัยสุด + data ~0 |
| **เสริม** | F (endpoint hardening) + G (monitoring) + H (IR plan) |

> **หลักเดียวที่ต้องจำ:** เสาโดน compromise แล้ว **ต้องลามเข้า production ไม่ได้** (segmentation) — ถ้ารับประกันข้อนี้ไม่ได้ ให้เลือกไม่ทำ

---

## อ้างอิง
- [decision-log.md](./decision-log.md) — `2026-06-25 · 4G/CGNAT` + `2026-06-26 · Park VPN`
- [production-readiness.md](./production-readiness.md) — `P2-4` Fleet/management
- [security-hardening.md](./security-hardening.md) — security ที่ apply แล้ว
- WireGuard: https://www.wireguard.com/ · nftables segmentation patterns
