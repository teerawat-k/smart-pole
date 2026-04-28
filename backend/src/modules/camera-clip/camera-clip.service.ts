import path from "node:path";
import { readdir, stat } from "node:fs/promises";
import { env } from "@/config/env";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { CAMERA_CLIP_DIR, CAMERA_CLIP_EXT } from "./camera-clip.constants";

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
};

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
