# Planning Convention

> กำหนดวิธีอ่านและเขียน PLANNING.md, CHANGELOG.md และ epic/task files

---

## โครงสร้างไฟล์

```
planning/
├── PLANNING.md              ← ภาพรวม epic ทั้งหมด + current sprint
├── CHANGELOG.md             ← บันทึกการเปลี่ยนแปลงจากลูกค้า
└── epics/
    └── E{nn}-{name}/
        ├── epic.md
        └── tasks/T{nn}.md
```

---

## Status

| Status | ความหมาย |
|--------|---------|
| `todo` | ยังไม่ได้เริ่ม |
| `in-progress` | กำลังทำอยู่ |
| `blocked` | ติดรอ task/epic อื่น |
| `review` | รอลูกค้า confirm |
| `done` | เสร็จและผ่าน test guide |

---

## Priority

- **0** — Master data ไม่มี FK dependency
- **1, 2, 3...** — เรียงตาม dependency จริง
- Epic ที่มี `Blocked by` ต้องรอ epic นั้น done ก่อน

---

## Epic / Task Convention

```markdown
# E{nn} · ชื่อ Epic
Priority: {n}
Blocked by: E{nn} หรือ —
Status: todo | in-progress | done

## Tasks
| Task | ชื่อ | Status |

## Notes
```

```markdown
# T{nn} · ชื่อ Task
Epic: E{nn}
Status: todo | in-progress | blocked | review | done
Blocked by: T{nn} หรือ —

## Expected
## Screens
## API
## Test Guide
## Notes
```

---

## หลังเสร็จงาน — ต้องเติม

- `## Summary` — อธิบายสั้น ๆ ทำอะไร
- `## Test Result` — ผล unit + integration test
- `## E2E Result` — ผล Playwright (ทำเมื่อ run batch)

### กฎ
- ห้าม mark done ถ้า Test Guide ไม่ผ่านครบ
- ห้าม mark done ถ้า unit/integration ไม่ผ่าน
- E2E รัน batch หลัง epic เสร็จ — ไม่บล็อก mark done ระหว่าง epic
