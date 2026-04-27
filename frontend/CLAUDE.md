# Frontend Convention

Stack: Next.js 16 App Router + TypeScript strict + Tailwind 4 + shadcn/ui + TanStack Query 5 + Zustand 5 + Axios

ระบบ internal — Client Components เป็นหลัก ไม่ต้อง SEO

---

## Environment

- ทุก env validate ผ่าน Zod ใน `config/env.ts` — ห้าม `process.env` โดยตรง, `NEXT_PUBLIC_` เฉพาะที่ frontend ใช้

---

## State Management

| State | ใช้ |
|---|---|
| Server data (API) | TanStack Query |
| Global UI (auth, sidebar) | Zustand |
| Local (toggle, form) | useState |

- QueryKey: `[resource, action, params?]`, staleTime 5min, retry 1, refetchOnWindowFocus false
- invalidate หลัง mutation: `queryClient.invalidateQueries({ queryKey: [resource] })`
- pagination: `placeholderData: keepPreviousData`

---

## API Client

- `lib/api/client.ts` Axios instance เดียว — ห้าม `axios.create()` นอกนี้, ห้าม `fetch`, ห้าม `useEffect + fetch`

### API สามประเภท

| ประเภท | Endpoint | ใช้เมื่อ |
|---|---|---|
| Table | `GET /` | ตารางหลัก — ส่ง `canWrite`/`canCancel` พร้อมใช้ |
| Lookup | `GET /lookup` | combobox — id+label, auth เท่านั้น |
| Detail | `GET /:id` | dialog รายละเอียด |

- **ตารางใช้ `GET /`, combobox/dropdown/filter ใช้ `GET /lookup` เสมอ — ไม่มีข้อยกเว้น**
- ห้าม frontend คำนวณ business logic จาก flags — ใช้ `entity.canCancel` ไม่ใช่ `hasPermission() && !isCancelled`
- ห้าม `hasPermission()` กับ action button — ใช้ flags จาก list (ยกเว้น menu visibility + page guard)

### API Module Pattern

```ts
// lib/api/branch.ts
export const branchApi = {
  list:   (params?, signal?) => apiClient.get<ListResponse<Branch>>("/branches", { params, signal }),
  lookup: (params?, signal?) => apiClient.get<ListResponse<BranchLookupItem>>("/branches/lookup", { params, signal }),
};
// hooks/api/use-branches.ts → useBranches() (ตาราง), useBranchLookup() (combobox)
```

- ใช้ shared types: `ListResponse`, `ListParams`, `MutationResponse` จาก `@/lib/api/types`

---

## Atomic Component Pattern

**ทุก component ทำ "1 อย่าง" — เหมือนฝั่ง backend**

- 1 component = 1 concern (display / input / action) — ห้ามรวม fetch + render + submit ใน component เดียว
- Container/Presentational split: container hook (data + mutation) → component receive props เท่านั้น
- Custom hook = atom: 1 hook 1 concern (`useFooList`, `useFooDetail`, `useCreateFoo`) — testable แยกได้
- Dialog = orchestrator ของ form: receive `entity`, render `<FooForm>` + handle submit/close — ห้ามมี fetch ภายใน
- Form atom: validation schema + UI fields เท่านั้น — ห้าม mutation logic
- หาก component > 500 LoC หรือ ≥ 3 concerns → แยก folder: `index.tsx` (orchestrator) + `<concern>.tsx` (atoms) + `*.utils.ts`

---

## Zustand

- persist: `${PROJECT_PREFIX}-<store>`, selector เสมอ, async logic นอก store
- `initialState` + reset function, skipHydration + rehydrate in providers
- logout: `resetAllStores()` + redirect, ห้ามเก็บ server data

---

## Loading & Error

| กรณี | วิธี |
|---|---|
| Initial load | loading component |
| Table | Skeleton |
| Submit | `isPending` + spinner |
| Error | message + retry |

- Optimistic update เฉพาะ reversible (toggle, reorder)
- Error boundary: `error.tsx` convention + ปุ่ม reset

### Error Recovery / Retry

| Status | Behavior |
|---|---|
| 400 | แสดง error — form เปิดให้แก้ |
| 401 | refresh token → fail → redirect login |
| 403 | "ไม่มีสิทธิ์" — ห้าม retry |
| 409 | "ถูกแก้ไขโดยผู้อื่น" — ปิด dialog + refetch |
| 429 | "กรุณารอ" — ห้าม auto retry |
| 5xx | แสดง error + requestId — retry 1 ครั้ง |

- Query: retry 1, Mutation: **ห้าม auto retry**
- Error toast แสดง `requestId` ถ้ามี

---

## Auth & RBAC

- Auth Guard ใน dashboard layout, `RoleGuard` component, `useAuth().hasRole()`
- Refresh token: retry อัตโนมัติเมื่อ 401

---

## WebSocket

- invalidate: `{ type: "invalidate", entity }` → `queryClient.invalidateQueries({ queryKey: [entity] })`
- notification push: `{ type: "notification", data }` → toast + bell count

---

## Performance

### Memoization
- `useMemo` เมื่อ computation แพง, `useCallback` เมื่อ prop ไป memoized child — ห้าม memo ทุกอย่าง

### Lazy-load Query
**ทุก `useQuery` ที่ยังไม่แสดงต้องมี `enabled` gate** — Dialog/Panel/Tab ยังไม่เปิด

- params คงที่ + `enabled` ควบคุม — ห้าม `open ? params : undefined`
- หน้า list โหลดแค่ตาราง+filter — dialog/lookup → lazy-load ตอนเปิด

---

## UI Standards

### Dialog
- sticky footer นอก scroll area, mode: create/edit/view, ห้ามปิดคลิกนอก
- Reset state: `onCloseAutoFocus` callback (ห้าม useEffect → flash)

### Alert Dialog
- `useAppAlertDialog().confirm({ title, description, onConfirm })` — ห้าม `window.confirm()`

### Table
- server-side pagination/sorting/filtering, `DataTable` component เสมอ
- double click → view, action column `fixed: "right"` DropdownMenu
- **ห้าม `useQuery` ใน cell** — lift ขึ้น page

### Table State Pattern

```ts
const { params, setSearch, setPage, setLimit, setSort, setFilter } = useTableParams({
  defaultSort: { column: "id", direction: "desc" },
  filters: { statusId: undefined, isActive: undefined },
});
```

### Search

- debounce **400ms** — search icon ซ้าย `pl-8`, width `w-64`
- ส่ง `undefined` เมื่อ empty — ห้ามส่ง `""`
- reset page 1 เมื่อ search เปลี่ยน

### Sort

- server-side เท่านั้น — 3-state: asc → desc → reset
- default `{ column: "id", direction: "desc" }`
- sortBy ต้องตรงกับ backend whitelist

### Filter

- ใช้ `AppCombobox` เสมอ, width `w-44`
- option แรก: "ทั้งหมด" (ส่ง `undefined`)
- dynamic filter options → โหลดจาก API lookup
- reset page 1 เมื่อ filter เปลี่ยน

### Column Visibility

- หน้าที่มี > 8 columns → ต้องมี column visibility popover
- persist ใน `localStorage` key: `${PROJECT_PREFIX}-columns-${pageKey}`
- **action column ห้ามซ่อน**

### Empty Text / Null Placeholder

- ค่าว่างหรือ null ให้แสดง `"—"` (em dash) — ห้าม `"-"`

### Bulk Actions

- max 100 items, deselect ทั้งหมดหลัง action สำเร็จ

### Form
- `react-hook-form` + `AppForm` + zod, required: label + `*` แดง
- view mode: plain text (ห้าม disabled input), ไม่มีค่า → `—`
- defaultValues string field ใช้ `""` ห้าม `undefined`

### Components
- `AppCombobox` (ห้าม Select), `AppDatePicker` (YYYY-MM-DD), `formatDate`/`formatDateTime` จาก `@/lib/format`
- `AppFileUpload`: upload เมื่อ submit, `ToggleStatus`: confirm + optimistic
- icon button → `Tooltip` + `aria-label`
- browser-only API → `next/dynamic({ ssr: false })`

### Code Splitting

- PDF/Chart/Rich editor → `next/dynamic({ ssr: false })`
- Excel export → `dynamic import()` ตอน user กด
- Complex dialog (> 500 lines) → `next/dynamic()` + skeleton

### Sidebar
- menu มี `children` ห้ามมี `path` — menu มี `path` ห้ามมี `children`

### Toast
- `result.message` / `error.message` จาก API เสมอ — ห้าม hardcode

---

## Mutation Error Handling

```ts
createFoo.mutate(values, {
  onSuccess: (result) => { toast.success(result.message); onOpenChange(false); onSuccess?.(); },
  onError: (error) => { toast.error(error.message); },
});
```

- ห้าม `mutateAsync` + try/catch (ยกเว้น multi-step sequential)
- **Invalidation ที่ parent page** — ห้าม dialog invalidate เอง

---

## Accessibility (a11y)

- icon button → `aria-label` + `Tooltip`, ห้าม `onClick` บน div
- ใช้ `AppForm`/`AppFormField` เสมอ
- ห้ามใช้สีเพียงอย่างเดียว — ต้องมี icon/text ประกอบ
- ทุก `<img>` มี `alt`, contrast ≥ 4.5:1
- ห้ามสร้าง modal ด้วย div (ใช้ Radix/shadcn)

---

## Export

| Format | Library |
|---|---|
| Excel | `exceljs` |
| PDF | `@react-pdf/renderer` (Thai font) |
| CSV | utility + BOM |

- ห้าม export ผ่าน backend — generate frontend ทั้งหมด

---

## Naming

| สิ่งที่ตั้ง | รูปแบบ |
|---|---|
| API module | `<entity>Api` object |
| Query hook | `use<Entities>()` (list), `use<Entity>(id)` (detail) |
| Mutation hook | `use<Action><Entity>()` |
| Dialog | `<Entity>Dialog` props: `{ open, onOpenChange, mode, entity?, onSuccess? }` |
| Column builder | `build<Entity>Columns()` |
| Zod | `<entity>Schema` → `<Entity>FormValues` |
| Store | `use<Name>Store()` persist: `"smart-pole-<store>"` |

---

## Type Safety & Import

- ห้าม `as` (ยกเว้น `as const`), union → type guard function, env → `isDev` จาก config
- `@/` alias เสมอ (ห้าม `../../`), same-folder ใช้ `./`

---

## Code Style

- ESLint + Prettier + Husky pre-commit — ห้าม `eslint-disable` ไม่มี comment
