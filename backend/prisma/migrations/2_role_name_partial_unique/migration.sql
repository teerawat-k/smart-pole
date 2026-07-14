-- Fix C: Role.name — full unique → partial unique (WHERE "deletedAt" IS NULL)
--
-- ปัญหา: soft-delete role (set deletedAt) แล้วสร้าง role ชื่อเดิมไม่ได้
--        เพราะ unique index เดิมนับ row ที่ soft-deleted ด้วย → ชื่อถูกจองค้าง
-- แก้:   ให้ unique บังคับเฉพาะ row ที่ยัง active (deletedAt IS NULL)
--        → active ห้ามชื่อซ้ำ แต่ soft-deleted ซ้ำได้ → recreate ชื่อเดิมได้
--
-- หมายเหตุ: Prisma ไม่รองรับ partial index ใน schema → จัดการด้วย raw SQL นี้
--           (schema ถอด @unique ออกจาก Role.name แล้ว; findByName filter deletedAt:null อยู่แล้ว)

DROP INDEX "Role_name_key";
CREATE UNIQUE INDEX "Role_name_key" ON "Role" ("name") WHERE "deletedAt" IS NULL;
