# E05 · Pole master module

> CRUD เสาสัญญาณ + lookup + sensor capability flags + MQTT credential
> ฟังก์ชันอ้างอิง: `project-backup/backend/src/services/pole.service.ts`

Priority: 2
Blocked by: E02
Status: done

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Prisma schema Pole + indexes + soft delete | done |
| T02 | Pole module — CRUD + lookup + pagination | done |
| T03 | Status enum + maintenance toggle | done |
| T04 | MQTT credential generate + regenerate | done |
| T05 | Block delete pole ที่มี recording/alert ค้าง | TODO (E09+E11) |
| T06 | Geolocation validation (lat/lng) | done |

## Atomic Structure

```
src/modules/pole/
├── pole.constants.ts
├── pole.repository.ts
├── pole.schema.ts
├── pole.service.ts        (orchestrator ~45 LoC)
├── pole.controller.ts
├── flow/
│   ├── generate-credential.ts (atom — pure helper, 5 tests)
│   ├── create.ts
│   ├── update.ts
│   ├── set-maintenance.ts
│   ├── regenerate-credential.ts
│   └── soft-delete.ts
└── index.ts
```

## Test Result
- 5 unit tests + smoke E2E ผ่าน
- All backend: **126 pass / 0 fail**
- Migration: `20260427175308_add_pole`
