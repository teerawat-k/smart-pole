# E13 · Frontend foundation — layout + auth-store + DataTable + AppForm

> Building blocks ของ frontend ทั้งระบบ — ทุก page ใน E14-E22 ต้อง build ทับ epic นี้
> เปลี่ยนจาก legacy: เพิ่ม shadcn/ui + RHF + Zustand + WebSocket hook

Priority: 1
Blocked by: E01
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Frontend bootstrap — Next + Tailwind + shadcn install | todo |
| T02 | env config + axios client + interceptor (401 → refresh) | todo |
| T03 | TanStack Query provider + queryClient config | todo |
| T04 | Zustand auth-store + persist + rehydrate | todo |
| T05 | shadcn install — Button, Input, Dialog, AlertDialog, Form, Table, Tabs, Combobox, Toast | todo |
| T06 | AppForm + AppFormField (RHF + Zod wrapper) | todo |
| T07 | AppCombobox + AppDatePicker + AppFileUpload | todo |
| T08 | AppDialog + AppAlertDialog + dialog-form-footer | todo |
| T09 | DataTable component — sort/filter/pagination/columnVisibility | todo |
| T10 | useTableParams hook | todo |
| T11 | useDebounce, useAppAlertDialog, useRouteGuard, usePermission | todo |
| T12 | useWebSocket hook + reconnect + invalidate handler | todo |
| T13 | TableActions + ColumnHeaderTooltip + EmptyState + InfoRow | todo |
| T14 | format helpers (date, money, file size) | todo |
| T15 | NotificationBell + toast wiring | todo |
| T16 | Module template script — `bun scripts/new-page.ts <name>` | todo |

## Notes
- ห้าม `axios.create()` นอก `lib/api/client.ts`
- ห้าม `fetch` นอก WebSocket
- shadcn ใน `components/ui/` ห้ามแก้ — ขยายผ่าน wrapper
- `components/layout/` = building blocks (AppForm, DataTable, ...)
- `components/shared/` = reusable cross-page (NotificationBell, EmptyState, ...)
