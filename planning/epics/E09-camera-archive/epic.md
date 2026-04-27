# E09 · Camera archive (MinIO + SRS callback + signed URL)

> Index video recordings + serve playback URL
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/recording.service.ts`

Priority: 3
Blocked by: E05
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | MinIO client plugin + bucket bootstrap | todo |
| T02 | VideoRecording schema + module | todo |
| T03 | SRS DVR callback endpoint — `/api/srs/dvr` | todo |
| T04 | Signed URL generator (presigned, 1 hr) | todo |
| T05 | List recordings + filter by date + duration filter | todo |
| T06 | Soft delete + retention cron job | todo |
| T07 | HLS live URL builder (per-pole) | todo |

## Notes
- DVR file path: `recordings/{poleName}/{YYYY-MM-DD}/{HHMM}-{HHMM2}.mp4` (จาก `srs.conf`)
- SRS push file → MinIO ผ่าน `mc mirror` หรือ S3 API (config ใน infra)
- Backend รับ callback จาก SRS → index ใน Postgres
- Signed URL: `presignedGetObject(bucket, key, expiry=3600)`
