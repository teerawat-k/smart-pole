# E11 · Alert engine + threshold rules + notification

> Alert lifecycle — create / dedupe / resolve / notify
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/mqtt.service.ts` (legacy ใส่ logic ใน MQTT handler — ผิด layer)

Priority: 4
Blocked by: E07,E08,E10
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Alert schema + module + lookup | todo |
| T02 | `alertService.createFromMqtt()` + dedupe | todo |
| T03 | `alertService.resolve()` (manual + auto) | todo |
| T04 | Threshold rules engine — `flow/evaluate-rule.ts` | todo |
| T05 | Notification module + recipient resolver | todo |
| T06 | Endpoint list/filter/bulk-resolve | todo |

## Notes
- Alert types: `pm25_high`, `temp_high`, `temp_low`, `humidity_high`, `humidity_low`, `signal_weak`, `pole_offline`, `tampering`, `device_error`
- Severity: `info` | `warning` | `critical`
- Dedupe: same pole + same alertType ภายใน 60s → ไม่สร้างใหม่ (config DB key)
- Notification recipients: ทุก user ที่มี role `admin` + ผู้ที่ subscribe pole นั้น (future)
