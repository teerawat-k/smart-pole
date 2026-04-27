# E02 · Module + Permission master + RBAC cache

> Master ของ permission system — Module (เปลี่ยนจาก `Page` ใน legacy) + Action + binding กับ RBAC cache
> Module ใช้รูปแบบ `module:action` (เช่น `pole:create`)

Priority: 1
Blocked by: E00
Status: todo

## Tasks

| Task | ชื่อ | Status |
|------|------|--------|
| T01 | Prisma schema — `Module`, `ModuleAction`, `Role`, `RolePermission` | todo |
| T02 | Module module — CRUD + lookup | todo |
| T03 | Seed permissions — script `seeds/permissions.ts` | todo |
| T04 | RBAC cache — wire กับ Permission update event | todo |
| T05 | Permission helper — `permissionToFlags(role, module)` → `{ canView, canCreate, ... }` | todo |

## Schema (เปลี่ยนจาก legacy)

```prisma
model Module {           // เดิม Page
  id           Int     @id @default(autoincrement())
  key          String  @unique           // "pole", "user", "role", "dashboard", ...
  displayName  String
  sortOrder    Int     @default(0)
  isActive     Boolean @default(true)
  deletedAt    DateTime?
  // audit fields
  permissions  RolePermission[]
}

model RolePermission {   // เดิม RolePagePermission
  id        Int     @id @default(autoincrement())
  roleId    Int
  moduleId  Int
  canView   Boolean @default(false)
  canCreate Boolean @default(false)
  canEdit   Boolean @default(false)
  canDelete Boolean @default(false)
  canExport Boolean @default(false)
  @@unique([roleId, moduleId])
}
```

## Notes

- **Bulk update** ใน `flow/replace-permissions.ts` ใช้ `$transaction([deleteMany, createMany])` แทน upsert ใน loop (legacy ทำผิด)
- หลัง update permission → emit event → RBAC cache invalidate role นั้น
