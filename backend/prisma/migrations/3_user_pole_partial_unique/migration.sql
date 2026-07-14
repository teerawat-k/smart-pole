-- Fix C (ต่อจาก migration 2): User + Pole — full unique → partial unique (WHERE "deletedAt" IS NULL)
--
-- ปัญหาเดียวกับ Role.name: soft-delete แล้วสร้างค่าเดิมไม่ได้ เพราะ unique index นับ soft-deleted ด้วย
-- แก้: unique บังคับเฉพาะ row ที่ยัง active (deletedAt IS NULL) → recreate ค่าที่ลบแล้วได้
--
-- dup-check ใน create-flow (findByUsername/Email/Name/Ddns/Mqtt) filter deletedAt:null อยู่แล้ว → align กัน
-- หมายเหตุ: Prisma ไม่รองรับ partial index ใน schema → จัดการด้วย raw SQL นี้ (schema ถอด @unique แล้ว)

-- ── User ──
DROP INDEX "User_username_key";
CREATE UNIQUE INDEX "User_username_key" ON "User" ("username") WHERE "deletedAt" IS NULL;

DROP INDEX "User_email_key";
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email") WHERE "deletedAt" IS NULL;

-- ── Pole ──
DROP INDEX "Pole_poleName_key";
CREATE UNIQUE INDEX "Pole_poleName_key" ON "Pole" ("poleName") WHERE "deletedAt" IS NULL;

DROP INDEX "Pole_ddnsHostname_key";
CREATE UNIQUE INDEX "Pole_ddnsHostname_key" ON "Pole" ("ddnsHostname") WHERE "deletedAt" IS NULL;

DROP INDEX "Pole_mqttUsername_key";
CREATE UNIQUE INDEX "Pole_mqttUsername_key" ON "Pole" ("mqttUsername") WHERE "deletedAt" IS NULL;
