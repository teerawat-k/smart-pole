import path from "node:path";
import { mkdir, stat, unlink } from "node:fs/promises";
import { env } from "@/config/env";

// ── File storage helpers ───────────────────────────────────
// Local file system — เก็บใน volume mount (ไม่ใช้ MinIO)
// Path convention: uploads/{module}/{YYYY}/{MM}/{id}-{ts}-{sanitized}.ext
//                  recordings/{poleName}/{YYYY-MM-DD}/{HHMM}-{HHMM2}.mp4

/** Sanitize filename — strip path traversal + non-ASCII → "_", limit ≤ 200 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 200);
}

/** Build relative storage path for upload module */
export function buildStoragePath(module: string, id: number, fileName: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ts = now.getTime();
  const safe = sanitizeFilename(fileName);
  return path.posix.join(env.UPLOAD_DIR, module, String(year), month, `${id}-${ts}-${safe}`);
}

/** mkdir -p (recursive) ของ parent dir ของไฟล์ */
export async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

/** ตรวจว่าไฟล์มีจริง */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.isFile();
  } catch {
    return false;
  }
}

/** ลบไฟล์แบบ best-effort — ไม่ throw ถ้าไม่มีไฟล์ */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
