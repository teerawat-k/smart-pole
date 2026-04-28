import path from "node:path";
import { readdir, stat, mkdir } from "node:fs/promises";
import { env } from "@/config/env";
import { NotFoundError, ValidationError, DuplicateError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import {
  CAMERA_CLIP_DIR,
  CAMERA_CLIP_EXT,
  CAMERA_CLIP_MIME,
  CAMERA_CLIP_MAX_BYTES,
} from "./camera-clip.constants";

// ── Validation guards (path traversal protection) ─────────
const POLE_NAME_RE = /^[a-zA-Z0-9_-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FILE_RE = /^[a-zA-Z0-9_.-]+\.mp4$/;

function assertPoleName(name: string): void {
  if (!POLE_NAME_RE.test(name)) {
    throw new NotFoundError(ErrorCode.CLIP_NOT_FOUND, "ชื่อเสาไม่ถูกต้อง");
  }
}
function assertDate(date: string): void {
  if (!DATE_RE.test(date)) {
    throw new NotFoundError(ErrorCode.CLIP_NOT_FOUND, "รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)");
  }
}
function assertFilename(file: string): void {
  if (!FILE_RE.test(file)) {
    throw new NotFoundError(ErrorCode.CLIP_NOT_FOUND, "ชื่อไฟล์ไม่ถูกต้อง");
  }
}

function poleRoot(poleName: string): string {
  return path.join(env.UPLOAD_DIR, CAMERA_CLIP_DIR, poleName);
}

export interface ClipDate {
  date: string;        // YYYY-MM-DD
  fileCount: number;
}

export interface ClipItem {
  filename: string;    // เช่น "08-30-15.mp4"
  sizeBytes: number;
  modifiedAt: string;  // ISO
}

export const cameraClipService = {
  /** คืนรายการวันที่ที่มีไฟล์ — sorted ใหม่ → เก่า */
  async listDates(poleName: string): Promise<ClipDate[]> {
    assertPoleName(poleName);
    const root = poleRoot(poleName);
    const entries = await safeReaddir(root);
    if (!entries) return [];

    const dates: ClipDate[] = [];
    for (const entry of entries) {
      if (!DATE_RE.test(entry)) continue;
      const files = await safeReaddir(path.join(root, entry));
      if (!files) continue;
      const count = files.filter((f) => f.toLowerCase().endsWith(CAMERA_CLIP_EXT)).length;
      if (count > 0) dates.push({ date: entry, fileCount: count });
    }
    return dates.sort((a, b) => b.date.localeCompare(a.date));
  },

  /** คืนรายการไฟล์ใน folder วันที่ — sorted ใหม่ → เก่า ตาม mtime */
  async listClips(poleName: string, date: string): Promise<ClipItem[]> {
    assertPoleName(poleName);
    assertDate(date);
    const dir = path.join(poleRoot(poleName), date);
    const files = await safeReaddir(dir);
    if (!files) return [];

    const items: ClipItem[] = [];
    for (const f of files) {
      if (!f.toLowerCase().endsWith(CAMERA_CLIP_EXT)) continue;
      const full = path.join(dir, f);
      const s = await safeStat(full);
      if (!s) continue;
      items.push({
        filename: f,
        sizeBytes: s.size,
        modifiedAt: s.mtime.toISOString(),
      });
    }
    return items.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  },

  /** resolve absolute path ของไฟล์ที่ปลอดภัย — throw ถ้าไม่พบ */
  async resolveClipPath(poleName: string, date: string, filename: string): Promise<{ fullPath: string; size: number }> {
    assertPoleName(poleName);
    assertDate(date);
    assertFilename(filename);
    const fullPath = path.join(poleRoot(poleName), date, filename);
    const s = await safeStat(fullPath);
    if (!s || !s.isFile()) {
      throw new NotFoundError(ErrorCode.CLIP_NOT_FOUND, "ไม่พบไฟล์วิดีโอ");
    }
    return { fullPath, size: s.size };
  },

  /**
   * บันทึกไฟล์ที่ upload เข้า <UPLOAD_DIR>/camera/<poleName>/<date>/<sanitized>.mp4
   * - ตรวจ MIME + extension + size
   * - กัน path traversal ผ่าน sanitize
   * - ห้าม overwrite ไฟล์เดิม
   */
  async uploadClip(input: {
    poleName: string;
    date: string;
    file: File;
  }): Promise<{ filename: string; sizeBytes: number }> {
    assertPoleName(input.poleName);
    assertDate(input.date);

    if (input.file.size === 0) {
      throw new ValidationError(ErrorCode.CLIP_INVALID_FILE, "ไฟล์ว่าง");
    }
    if (input.file.size > CAMERA_CLIP_MAX_BYTES) {
      throw new ValidationError(
        ErrorCode.CLIP_TOO_LARGE,
        `ไฟล์ใหญ่เกิน ${Math.floor(CAMERA_CLIP_MAX_BYTES / 1024 / 1024)} MB`,
      );
    }
    // browser อาจส่ง MIME ว่าง — ตรวจ extension เป็นหลัก, MIME รองถ้ามี
    if (input.file.type && input.file.type !== CAMERA_CLIP_MIME) {
      throw new ValidationError(ErrorCode.CLIP_INVALID_FILE, "รองรับเฉพาะไฟล์ MP4");
    }
    const original = input.file.name ?? "";
    const sanitized = sanitizeClipFilename(original);
    if (!sanitized) {
      throw new ValidationError(ErrorCode.CLIP_INVALID_FILE, "ชื่อไฟล์ไม่ถูกต้อง — ต้องลงท้ายด้วย .mp4");
    }

    const dir = path.join(poleRoot(input.poleName), input.date);
    const fullPath = path.join(dir, sanitized);

    // กัน overwrite
    const existing = await safeStat(fullPath);
    if (existing) {
      throw new DuplicateError(ErrorCode.CLIP_DUPLICATE, `มีไฟล์ชื่อ "${sanitized}" อยู่แล้ว`);
    }

    await mkdir(dir, { recursive: true });
    await Bun.write(fullPath, input.file);

    return { filename: sanitized, sizeBytes: input.file.size };
  },
};

/** sanitize filename — strip path traversal + non-safe chars, บังคับ .mp4 */
function sanitizeClipFilename(name: string): string | null {
  const base = name
    .replace(/[/\\]/g, "_")
    .replace(/\.\./g, "_")
    .replace(/[^\w.\-]/g, "_")
    .slice(0, 200);
  if (!base.toLowerCase().endsWith(CAMERA_CLIP_EXT)) return null;
  // ห้ามชื่อขึ้นต้น . หรือว่าง
  if (base.startsWith(".") || base === CAMERA_CLIP_EXT) return null;
  return base;
}

async function safeReaddir(p: string): Promise<string[] | null> {
  try {
    return await readdir(p);
  } catch {
    return null;
  }
}

async function safeStat(p: string) {
  try {
    return await stat(p);
  } catch {
    return null;
  }
}
