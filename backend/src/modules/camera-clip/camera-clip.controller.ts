import { Elysia, t } from "elysia";
import { cameraClipService } from "./camera-clip.service";
import { CAMERA_CLIP_MIME, CAMERA_CLIP_MAX_BYTES } from "./camera-clip.constants";

export const cameraClipController = new Elysia({ prefix: "/api/cameras" })
  .get(
    "/:poleName/dates",
    async ({ params }) => {
      const data = await cameraClipService.listDates(params.poleName);
      return { success: true, data };
    },
    { params: t.Object({ poleName: t.String({ minLength: 1, maxLength: 100 }) }) },
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
    },
  )
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

      // Full content
      if (!range) {
        set.headers["Content-Type"] = CAMERA_CLIP_MIME;
        set.headers["Content-Length"] = String(size);
        set.headers["Accept-Ranges"] = "bytes";
        set.headers["Cache-Control"] = "private, max-age=3600";
        return file;
      }

      // Range request: bytes=start-end
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
  )
  .post(
    "/:poleName/upload",
    async ({ params, body }) => {
      const result = await cameraClipService.uploadClip({
        poleName: params.poleName,
        date: body.date,
        file: body.file,
      });
      return { success: true, data: result, message: "อัปโหลดไฟล์สำเร็จ" };
    },
    {
      params: t.Object({ poleName: t.String({ minLength: 1, maxLength: 100 }) }),
      body: t.Object({
        date: t.String({ minLength: 10, maxLength: 10 }),
        file: t.File({ maxSize: CAMERA_CLIP_MAX_BYTES, type: CAMERA_CLIP_MIME }),
      }),
    },
  );
