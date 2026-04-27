# Docs Convention

> เอกสารโปรเจคทั้งหมดอยู่ใน `docs/` — แบ่งตาม lifecycle

---

## โครงสร้างไฟล์

```
docs/
├── CLAUDE.md
├── overview.md                ← ภาพรวมโปรเจค — อ่านก่อนทุกอย่าง
├── decision-log.md            ← บันทึกการตัดสินใจสำคัญ
├── test-scenarios/            ← source เอกสารตรวจรับ
│   └── <group>/<module>/      ← .md + .xlsx + generate.ts
└── delivery/                  ← .xlsx พร้อมส่งลูกค้า
    └── <ชื่อกลุ่มเมนูไทย>/
```

---

## overview.md Convention

```markdown
# Project Overview

## โปรเจคนี้คืออะไร

## ลูกค้า / ผู้ใช้งาน

## เป้าหมายหลัก

## Scope (✅ in / ❌ out)

## Timeline

## ผู้เกี่ยวข้อง
```

---

## decision-log.md Convention

```markdown
## YYYY-MM-DD · ชื่อการตัดสินใจ
- **สถานการณ์:**
- **ตัดสินใจ:**
- **เหตุผล:**
- **ผลที่ตามมา:**
```

- เพิ่ม entry ใหม่ **ด้านบนเสมอ**
- ห้ามลบ entry เก่า

---

## test-scenarios/ Convention

```
<module>.md (source) → generate.ts → <module>.xlsx → คัดลอกไป delivery/ (ชื่อไทย)
```

- `.md` เป็น source of truth — ห้ามแก้ `.xlsx` ตรง
- 1 module = 1 folder ภายใต้ `<group>/`
- Run: `bun run docs/test-scenarios/<group>/<module>/generate.ts`

---

## ศัพท์ภาษาไทยในเอกสาร

ใช้กับ **ทุกเอกสารที่ส่งลูกค้า** — ห้ามใช้คำภาษาอังกฤษเมื่อมีคำไทยทดแทน

| EN (ห้าม) | TH (ใช้แทน) |
|---|---|
| Dialog | กล่องโต้ตอบ |
| Validation | ตรวจสอบข้อมูล |
| Double-click | ดับเบิลคลิก |
| toggle | สลับ / สลับสถานะ |
| dropdown / combobox | รายการเลือก |
| field | ฟิลด์ |
| header | ส่วนหัว |
| search | ค้นหา / ช่องค้นหา |
| Preview | ตัวอย่าง |
| Hover | นำเมาส์ไปวาง |
| columns | คอลัมน์ |
| tab | แท็บ |
| measurement | ค่าวัด |

**ข้อยกเว้น** — ใช้อังกฤษได้เมื่อเป็นค่าจริง: `text`/`select`/`number`, URL path `/settings/poles`
