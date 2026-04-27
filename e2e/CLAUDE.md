# E2E Convention

Stack: Playwright — ทดสอบจาก user perspective เปิด browser จริง

---

## โครงสร้าง

```
e2e/
├── global-setup.ts          # cleanup + seed ข้อมูลกลางก่อน test ทั้งหมด
├── global-teardown.ts       # cleanup หลัง test ทั้งหมด
├── helpers/
│   ├── auth.ts              # login helper (atom)
│   └── seed.ts              # seed/cleanup helper (atom)
├── specs/
│   └── <module>/
│       └── <action>/
│           ├── <action>.spec.ts
│           └── screenshots/
└── playwright.config.ts
```

### กฎการแบ่ง spec

- 1 module = 1 folder ภายใต้ `specs/`
- 1 action = 1 sub-folder + 1 spec file (`create/`, `edit/`, `delete/`, `toggle/`)
- ห้ามรวมหลาย module ใน spec เดียว

---

## Test Data Strategy

| ระดับ | วิธี |
|---|---|
| Global Setup | seed ข้อมูลกลาง (users, roles) |
| beforeEach | **cleanup ก่อน** แล้วค่อย seed |
| afterEach | cleanup เสมอ |
| Global Teardown | cleanup ทั้งหมด |

- Test endpoint (`/test/seed`, `/test/cleanup/*`) เปิดเฉพาะ `NODE_ENV=test`
- `beforeEach` ต้อง cleanup ก่อน seed เสมอ

---

## Screenshot Convention

- Path: `specs/<module>/<action>/screenshots/{nn}-{ขั้นตอนภาษาไทย}.png`
- เลขลำดับ 2 หลัก: `01-`, `02-`, ...
- **ห้ามถ่าย screenshot ก่อน expect**

---

## UI Render Rule

| สถานการณ์ | รอ |
|---|---|
| goto หน้าใหม่ | `expect(h1).toContainText(...)` |
| เปิด dialog | `expect(h2).toContainText(...)` แล้ว `waitForTimeout(500)` |
| ปิด dialog (submit) | `expect("[role='dialog']").not.toBeVisible({ timeout: 10000 })` |
| toast สำเร็จ | `expect(getByText("...สำเร็จ")).toBeVisible()` |

---

## Selector Standards

- Row: `page.locator("tr", { hasText: "..." })`
- Actions: `row.locator("button[aria-haspopup='menu']").click()`
- Menuitem: `page.getByRole("menuitem", { name: "แก้ไข" })`
- Input: `page.locator("[role='dialog'] input[name='fieldName']").pressSequentially("value")` (ห้าม `fill`)
- AlertDialog: `page.getByRole("alertdialog")`

---

## Standard Test Cases (CRUD)

### Create (3 cases บังคับ)
1. ระบบแสดง validation เมื่อไม่กรอก required fields
2. ผู้ใช้สามารถเพิ่ม \<module\> ใหม่โดยกรอกข้อมูลครบทุกช่องได้
3. ระบบแสดง error เมื่อสร้างด้วยรหัส/ชื่อที่ซ้ำ

### Edit (2 cases บังคับ)
1. ระบบแสดง validation เมื่อลบ required fields ให้ว่าง
2. ผู้ใช้สามารถแก้ไขข้อมูลครบทุกช่องได้

### อื่นๆ
- `delete/`, `toggle/`, `list/`, `search/`, `view/`

---

## Test Description Convention

```ts
test("ผู้ใช้สามารถสร้างใบเสนอราคาใหม่ได้")  // ✅ ภาษาไทย user-friendly
test("POST /quotations returns 200")           // ❌ technical
```

---

## กฎ

- test description **ภาษาไทย** เสมอ
- screenshot ทุก step สำคัญ ตั้งชื่อลำดับภาษาไทย
- **ห้าม action กับ element ก่อน UI render**
- 1 module = 1 spec folder
- `beforeEach`: cleanup ก่อน seed
- E2E รัน batch ทีเดียวหลัง epic เสร็จ
