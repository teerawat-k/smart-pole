import { Elysia, t } from "elysia";
import { cameraClipService } from "./camera-clip.service";
import { CAMERA_CLIP_MIME } from "./camera-clip.constants";
import { authGuard } from "@/plugins/jwt";
import { requirePermission } from "@/common/middleware/require-permission";

// แยกเป็น 2 sub-controller:
//   - List endpoints (/latest, /clips) — auth + permission camera_archive:view หรือ dashboard:view
//   - Stream endpoint — auth-only ที่ระดับ route (token ใน Authorization header)
//
// หมายเหตุ /stream: browser <video src=...> ไม่ส่ง Authorization header → ต้อง keep open
// path มี pole/date/file ที่ค่อนข้างยาก guess + list endpoint ถูก lock = defense in depth
// production สามารถปรับเป็น signed-URL ภายหลัง (issue 1-hour token ผ่าน /clips response)

const VIEW_PERMS = ["camera_archive:view", "dashboard:view"] as const;

export const cameraClipController = new Elysia({ prefix: "/api/cameras" })
  // ── List endpoints — auth + permission ──────────────────
  .use(authGuard)
  .get(
    "/:poleName/latest",
    async ({ params }) => {
      const data = await cameraClipService.getLatestClip(params.poleName);
      return { success: true, data };
    },
    {
      params: t.Object({ poleName: t.String({ minLength: 1, maxLength: 100 }) }),
      beforeHandle: requirePermission(...VIEW_PERMS),
    },
  )
  .get(
    "/:poleName/clips",
    async ({ params, query }) => {
      const data = await cameraClipService.listClips(params.poleName, query.date);
      return { success: true, data };
    },
    {
      params: t.Object({ poleName: t.String({ minLength: 1, maxLength: 100 }) }),
      query: t.Object({ date: t.String({ minLength: 10, maxLength: 10 }) }),
      beforeHandle: requirePermission(...VIEW_PERMS),
    },
  );

// Stream endpoint — public route (browser <video> ไม่ส่ง Authorization header)
// path validation + list endpoint lock = defense in depth
// upgrade เป็น signed URL ภายหลัง (เปิด docs/production-readiness.md เป็น P2 ใหม่)
export const cameraClipStreamController = new Elysia({ prefix: "/api/cameras" })
  .get(
    "/:poleName/stream",
    async ({ params, query, headers, set }) => {
      const { fullPath, size } = await cameraClipService.resolveClipPath(
        params.poleName,
        query.date,
        query.file,
      );
      const file = Bun.file(fullPath);
      const range = headers.range;

      if (!range) {
        set.headers["Content-Type"] = CAMERA_CLIP_MIME;
        set.headers["Content-Length"] = String(size);
        set.headers["Accept-Ranges"] = "bytes";
        set.headers["Cache-Control"] = "private, max-age=3600";
        return file;
      }

      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        set.status = 416;
        set.headers["Content-Range"] = `bytes */${size}`;
        return "";
      }
      const start = Number(match[1]);
      const end = match[2] ? Number(match[2]) : size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= size) {
        set.status = 416;
        set.headers["Content-Range"] = `bytes */${size}`;
        return "";
      }

      set.status = 206;
      set.headers["Content-Type"] = CAMERA_CLIP_MIME;
      set.headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
      set.headers["Content-Length"] = String(end - start + 1);
      set.headers["Accept-Ranges"] = "bytes";
      return file.slice(start, end + 1);
    },
    {
      params: t.Object({ poleName: t.String({ minLength: 1, maxLength: 100 }) }),
      query: t.Object({
        date: t.String({ minLength: 10, maxLength: 10 }),
        file: t.String({ minLength: 1, maxLength: 200 }),
      }),
    },
  );
