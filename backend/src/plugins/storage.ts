import path from "node:path";
import { mkdir } from "node:fs/promises";
import { env } from "@/config/env";

// Atom helper: build relative storage path ตาม convention
// uploads/{module}/{year}/{month}/{id}-{timestamp}-{sanitized-name}.ext
export function buildStoragePath(module: string, id: number, fileName: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const ts = now.getTime();
  const safe = fileName.replace(/[^\w.\-]/g, "_").slice(0, 200);
  return path.posix.join(env.UPLOAD_DIR, module, String(year), month, `${id}-${ts}-${safe}`);
}

export async function ensureDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}
