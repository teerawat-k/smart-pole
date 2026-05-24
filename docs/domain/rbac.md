# RBAC — Role-Based Access Control

> โครงสร้าง permission + role + การตรวจ access ใน Smart Pole

---

## Data Model

```
Permission (master)              Role                    User
├── module      string           ├── name (unique)       ├── roleId → Role
├── action      string           ├── isSystem            └── status (active|disabled|locked)
├── category    string           └── deletedAt
├── categoryLabel string             │
├── moduleLabel  string             │
├── actionLabel  string             │
└── actionDescription string         │
       ▲                            │
       │                            ▼
       └─────── RolePermission ─────┘
                (roleId × permissionId, unique pair)
```

**กฎ:**
- 1 user = **1 role** (ไม่มี multi-role)
- 1 role = N permissions (junction `RolePermission`)
- Permission `(module, action)` unique pair — เพิ่ม module ใหม่ผ่าน seed
- **ไม่มี `pageKey` field** — granularity คือ `module:action` ไม่ใช่ page level

---

## Modules & Actions ปัจจุบัน

ดู [seeds/permissions.ts](../../backend/prisma/seeds/permissions.ts):

| Category | Module | Actions |
|---|---|---|
| **Monitoring** | `dashboard` | `view` |
| | `camera_archive` | `view` |
| | `sensor_archive` | `view` |
| **Master** | `pole` | `view, create, edit, delete` |
| **Admin** | `user` | `view, create, edit, delete` |
| | `role` | `view, create, edit, delete` |
| | `system_log` | `view` |

**รวม 15 permissions**

> Permission `export` มี action label ใน `buildModule()` แต่ไม่ได้ seed ให้ module ไหน — เผื่ออนาคต

---

## Default Roles

ดู [seeds/roles.ts](../../backend/prisma/seeds/roles.ts):

| Role | isSystem | สิทธิ์เริ่มต้น | ลบได้ |
|---|---|---|---|
| `admin` | ✅ | bypass ทุก permission | ❌ (isSystem) |
| `user` | ❌ | `dashboard:view`, `camera_archive:view`, `sensor_archive:view` | ✅ (admin แก้สิทธิ์ + ลบได้) |

**ข้อสังเกต:** Chat dump บอกว่า "system role 2 อันลบไม่ได้" — ผิด. มีแค่ `admin` ที่ `isSystem=true`

---

## Admin Bypass

Admin role (`isSystem=true`) bypass permission check ทั้งหมด:
```ts
if (user.isSystemRole) return true;          // pass any permission
return user.permissions.includes(`${module}:${action}`);
```

---

## Frontend RBAC

### AuthUser shape

ดู [stores/auth-store.ts:5-12](../../frontend/stores/auth-store.ts):
```ts
interface AuthUser {
  id: number;
  username: string;
  role: string;                    // role name (e.g. "admin")
  name: string;                    // full name display
  isSystemRole: boolean;           // bypass flag
  permissions: string[];           // ["module:action", ...]
}
```

### Page Guard

```ts
// dashboard layout
const { hasPermission } = useAuth();
if (!hasPermission("dashboard:view")) redirect("/");
```

### Action Button

❌ **ห้าม:** `if (hasPermission("pole:edit")) <EditButton />`

✅ **ใช้:** flag จาก list API — `if (pole.canEdit) <EditButton />`

> Backend ตอบ flag (`canEdit, canDelete, canCancel`) มาพร้อม list — frontend ห้ามคำนวณเอง (ดู [00-root-CLAUDE.md](../../CLAUDE.md))

⚠️ **ปัจจุบัน**: list response ยังไม่ส่ง flags + controller ยังไม่ตรวจ permission (ดู [production-readiness.md P0-1/P0-2](../production-readiness.md))

### Menu Visibility

`AppSider` แสดง menu เฉพาะที่ user มี permission view:
```ts
// pseudo
menus.filter((m) => hasPermission(`${m.module}:view`))
```

---

## Backend RBAC

### Plugin

ดู [plugins/auth.ts](../../backend/src/plugins/auth.ts):
```ts
export const authGuard = new Elysia({ name: "auth-guard" })
  .use(jwtAccessPlugin)
  .use(bearer())
  .derive({ as: "scoped" }, async ({ jwt, bearer }) => {
    // verify token → { sub, role, tokenVersion }
    return { user: { id: sub, role, tokenVersion } };
  });
```

⚠️ **ยังไม่มี `requirePermission()` helper** — ต้อง implement ตอนแก้ P0-1/P0-2:
```ts
// proposed
export function requirePermission(perm: string) {
  return { beforeHandle: async ({ user }) => {
    const userPerms = await getUserPermissions(user.id);
    if (!userPerms.includes(perm)) throw new ForbiddenError(...);
  }};
}
```

### Controller Pattern (proposed)

```ts
poleController
  .use(authGuard)
  .get("/",                                              ...handler)   // auth only
  .get("/lookup",                                        ...handler)   // auth only
  .post("/",  { ...requirePermission("pole:create") },   ...handler)
  .patch("/:id", { ...requirePermission("pole:edit") }, ...handler)
  .delete("/:id", { ...requirePermission("pole:delete") }, ...handler);
```

---

## JWT Payload

```ts
// signed in controller (ไม่ใช่ใน flow/login.ts)
jwt.sign({
  sub: user.id,
  role: user.roleName,             // role NAME, ไม่ใช่ roleId
  tokenVersion: user.tokenVersion, // for revoke-all
});
```

**ไม่ embed permissions ใน JWT** — เปลี่ยน role/permission แล้วต้อง relogin (หรือ DB lookup ทุก request)

> Trade-off: เก็บ permissions ใน JWT = ลด DB lookup แต่ revoke ยาก; ตอนนี้เลือก lookup DB ทุก request (cache role permissions ได้ภายหลัง)

---

## Adding New Permission

1. เพิ่ม entry ใน [seeds/permissions.ts](../../backend/prisma/seeds/permissions.ts):
   ```ts
   ...buildModule("new_module", "Category", "category_key", "ป้ายไทย", ["view", "create", ...]),
   ```
2. รัน `bun db:seed` → upsert permission ใหม่ + รักษา role permission เก่า
3. เพิ่มใน controller `requirePermission("new_module:action")` ตามจุดที่ต้องการ
4. Frontend: ถ้าเป็น menu → เพิ่มใน `AppSider`; ถ้า action → ใช้ flag จาก list API

---

## Last Admin Guard

ห้าม disable/delete admin คนสุดท้ายของระบบ — guard ใน [user/shared/guards.ts](../../backend/src/modules/user/shared/guards.ts):

```ts
assertNotLastActiveAdmin(targetUserId)
  → ถ้า target เป็น admin AND active_admin_count <= 1 → throw ConflictError
```

ครอบทั้ง:
- `PATCH /api/users/:id/status` (set disabled)
- `DELETE /api/users/:id` (soft delete)

> ป้องกัน scenario lockout ทั้งระบบที่ไม่มี admin เหลือเลย
