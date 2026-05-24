# 003. Filesystem storage — ไม่ใช้ MinIO/S3

- **Status:** accepted
- **Date:** 2026-04-28 (ดู git commit `cd196088` — `feat(camera): replace SRS/HLS live with file-based clip browser`)
- **Supersedes:** plan เดิม "MinIO + presigned URL" สำหรับ video storage

---

## Context

ต้องเก็บไฟล์วิดีโอจากกล้อง (DVR mp4 segment 30 นาที, เก็บ 30 วัน) + serve ให้ frontend เปิดดูได้

ขนาดข้อมูล:
- 1 segment 30 นาที ~ 200-500 MB (H.265 1080p)
- 1 เสา = 48 segment/day × 30 day = 1,440 segment ≈ 300-700 GB/เสา
- 10 เสา = ~7 TB

ข้อพิจารณา:
- Streaming protocol (Range request)
- ขยาย (เพิ่ม disk vs migrate S3)
- Backup/lifecycle
- ความเรียบง่ายของ dev/deploy
- Cloud cost

---

## Decision

ใช้ **filesystem ตรง** — เก็บไฟล์ที่ `data/uploads/camera/<poleName>/<YYYY-MM-DD>/<HH-MM-SS>.mp4`

Serve ผ่าน **Elysia static plugin** (`@elysiajs/static`) + browser ใช้ HTTP Range request โดยอัตโนมัติ

Backend อ่าน filesystem ตรงด้วย `node:fs/promises.readdir` + `stat` — ไม่มี DB index ของไฟล์

---

## Alternatives Considered

| Option | ข้อดี | ข้อเสีย | ตัดสิน |
|---|---|---|---|
| MinIO + presigned URL | S3-compatible, scale-out, multi-region | ต้องดูแล cluster + bucket policy + IAM, backend ต้องเรียก presign API ทุกครั้ง, dev workflow ซับซ้อน | ❌ |
| AWS S3 / R2 / GCS | Managed, durable | Cloud egress cost สูงเมื่อ video volume สูง, dev offline ไม่สะดวก | ❌ (โครงการ on-premise → cloud) |
| Database BLOB | Transactional | Performance แย่, DB ใหญ่บวม, backup ช้า | ❌ (anti-pattern) |
| **Filesystem + static serve** | เรียบง่ายสุด, Range request built-in, backup = rsync, ไม่มี extra service | Single-host (เพิ่ม disk → vertical), permission ต้องดูดี, ขยาย multi-host ต้องเปลี่ยน (อย่าง NFS หรือ S3 ภายหลัง) | ✅ |

---

## Consequences

### Positive
- 0 dependency service เพิ่ม
- Dev เปิด clip ทดสอบได้ทันที — ลากไฟล์ใส่ folder
- Backup = `tar`/`rsync` ตรง
- Cost ต่ำสุด (disk เท่านั้น)
- HTTP Range request browser handle เอง — ไม่ต้อง code

### Negative
- **Single point of failure** — host หาย = clip หาย ทุกเสา
- ขยายแนวกว้างต้องใช้ network filesystem (NFS) หรือ migrate ไป S3 อย่างเดียว
- ไม่มี lifecycle policy auto — ต้องเขียน cron `find ... -mtime +30 -delete`
- ไม่มี audit ใครเข้าถึงไฟล์ (เหมือน static file)

### Mitigation
- Backup nightly → external storage (rsync ไปอีกเครื่อง / cold storage)
- Disk monitoring + alert ที่ 80% full
- ถ้าเสา > 50 ตัว หรือ data > 10 TB → migrate ไป MinIO หรือ S3 (refactor service layer)

### Trigger ให้ migrate ไป object storage
- รวม disk > 10 TB
- ต้องการ multi-host backend (horizontal scale)
- ลูกค้า request multi-region access
- Compliance ต้องมี audit access log

---

## Migration Path (เมื่อต้องย้าย)

1. สร้าง abstraction layer — `cameraClipService.resolveClipPath()` → return URL หรือ Stream
2. Implement `MinioClipDriver` + `FilesystemClipDriver` (strategy pattern)
3. เพิ่ม env `CLIP_STORAGE_DRIVER=filesystem|minio`
4. Migrate ไฟล์ด้วย script (one-shot) → switch driver → verify

---

## References

- Service: [backend/src/modules/camera-clip/camera-clip.service.ts](../../../backend/src/modules/camera-clip/camera-clip.service.ts)
- Static serve: [backend/src/index.ts:32](../../../backend/src/index.ts) `.use(staticPlugin({ prefix: "/uploads", assets: env.UPLOAD_DIR }))`
- Path validation: regex `POLE_NAME_RE / DATE_RE / FILE_RE` — กัน path traversal
