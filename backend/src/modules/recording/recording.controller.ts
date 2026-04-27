import { Elysia, t } from "elysia";
import path from "node:path";
import { stat } from "node:fs/promises";
import { recordingService } from "./recording.service";
import { recordingListQuery, srsCallbackSchema } from "./recording.schema";
import { prisma } from "@/plugins/prisma";
import { env } from "@/config/env";
import { ForbiddenError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";

function getUserId(headers: Record<string, string | undefined>): number {
  const raw = headers["x-user-id"];
  return raw ? Number(raw) : 1;
}

export const recordingController = new Elysia({ prefix: "/api/recordings" })
  .get(
    "/",
    async ({ query }) => {
      const result = await recordingService.list({
        page: query.page,
        limit: query.limit,
        poleId: query.poleId,
        date: query.date ? new Date(query.date) : undefined,
        minDuration: query.minDuration,
      });
      return { success: true, ...result, page: query.page, limit: query.limit };
    },
    { query: recordingListQuery },
  )
  .get(
    "/:id",
    async ({ params }) => {
      const data = await recordingService.getById(BigInt(params.id));
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .get(
    "/:id/url",
    async ({ params, headers }) => {
      const data = await recordingService.getPlaybackUrl(BigInt(params.id), getUserId(headers));
      return { success: true, data };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  )
  .delete(
    "/:id",
    async ({ params, headers }) => {
      await recordingService.delete(BigInt(params.id), getUserId(headers));
      return { success: true, message: "ลบ recording สำเร็จ" };
    },
    { params: t.Object({ id: t.Numeric({ minimum: 1 }) }) },
  );

// ── SRS DVR callback (separate prefix, shared-secret guard) ─────────
export const srsCallbackController = new Elysia({ prefix: "/api/srs" }).post(
  "/on-dvr",
  async ({ body, headers }) => {
    const token = headers["x-srs-token"];
    if (token !== env.SRS_DVR_TOKEN) {
      throw new ForbiddenError(ErrorCode.AUTH_FORBIDDEN, "Invalid SRS token");
    }

    // resolve poleId from stream (= poleName)
    const pole = await prisma.pole.findFirst({
      where: { poleName: body.stream, deletedAt: null },
      select: { id: true },
    });
    if (!pole) {
      // SRS spec: return 0 = success, !=0 = reject
      return { code: 0, msg: "pole not found, ignored" };
    }

    // file path from SRS — use as relative storage path
    const filename = path.basename(body.file);
    const storagePath = body.file.startsWith("/") ? body.file.slice(1) : body.file;

    // try to read file metadata for fileSizeBytes + duration
    let fileSize: number | undefined;
    try {
      const fullPath = path.join(env.RECORDINGS_DIR, storagePath);
      const stats = await stat(fullPath);
      fileSize = stats.size;
    } catch {
      // file not yet flushed — ignore
    }

    const now = new Date();
    await recordingService.indexFromSrs({
      poleName: body.stream,
      poleId: pole.id,
      filename,
      storagePath,
      recordedDate: new Date(now.toISOString().slice(0, 10)),
      startTime: now,
      endTime: now,
      durationSec: 0, // SRS อาจส่งใน param — กรณีไม่มีใส่ 0 ก่อน
      fileSizeBytes: fileSize,
    });

    return { code: 0 };
  },
  { body: srsCallbackSchema },
);
