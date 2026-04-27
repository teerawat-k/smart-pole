import { recordingRepository } from "./recording.repository";
import { auditService, AuditAction } from "@/modules/audit";
import { NotFoundError } from "@/common/errors";
import { ErrorCode } from "@/common/errors/codes";
import { fileExists } from "@/plugins/storage";
import { signPlaybackToken } from "./flow/sign-playback-url";
import { RECORDING_ENTITY, PLAYBACK_TOKEN_TTL_SEC } from "./recording.constants";
import { env } from "@/config/env";
import path from "node:path";

export const recordingService = {
  list: recordingRepository.findMany.bind(recordingRepository),

  async getById(id: bigint) {
    const rec = await recordingRepository.findById(id);
    if (!rec) throw new NotFoundError(ErrorCode.RECORDING_NOT_FOUND, "ไม่พบ recording ที่ระบุ");
    return rec;
  },

  /**
   * Index recording from SRS callback
   * idempotent: filename @unique → ถ้ามีแล้ว return เดิม (ไม่ throw)
   */
  async indexFromSrs(input: {
    poleName: string;
    poleId: number;
    filename: string;
    storagePath: string;
    recordedDate: Date;
    startTime: Date;
    endTime: Date;
    durationSec: number;
    fileSizeBytes?: number;
  }) {
    const existing = await recordingRepository.findByFilename(input.filename);
    if (existing && !existing.deletedAt) {
      return { id: existing.id, indexed: false };
    }
    const created = await recordingRepository.create(input);
    return { id: created.id, indexed: true };
  },

  async getPlaybackUrl(id: bigint, requestUserId: number) {
    const rec = await recordingRepository.findById(id);
    if (!rec) throw new NotFoundError(ErrorCode.RECORDING_NOT_FOUND, "ไม่พบ recording ที่ระบุ");

    const fullPath = path.join(env.RECORDINGS_DIR, rec.storagePath);
    const exists = await fileExists(fullPath);
    if (!exists) {
      throw new NotFoundError(ErrorCode.RECORDING_FILE_MISSING, "ไฟล์ video ไม่อยู่ในระบบแล้ว");
    }

    const token = signPlaybackToken(rec.id, requestUserId);
    const url = `/recordings/${rec.storagePath}?token=${token}`;

    auditService.log({
      userId: requestUserId,
      action: AuditAction.UPDATE, // playback access — ใช้ UPDATE เพื่อ trace
      module: RECORDING_ENTITY,
      targetId: Number(rec.id),
      payload: { event: "playback_request", filename: rec.filename },
    });

    return {
      url,
      filename: rec.filename,
      startTime: rec.startTime,
      endTime: rec.endTime,
      expiresAt: new Date(Date.now() + PLAYBACK_TOKEN_TTL_SEC * 1000),
    };
  },

  async delete(id: bigint, requestUserId: number) {
    const rec = await recordingRepository.findById(id);
    if (!rec) throw new NotFoundError(ErrorCode.RECORDING_NOT_FOUND, "ไม่พบ recording ที่ระบุ");
    await recordingRepository.softDelete(id, requestUserId);
    auditService.log({
      userId: requestUserId,
      action: AuditAction.DELETE,
      module: RECORDING_ENTITY,
      targetId: Number(rec.id),
      payload: { filename: rec.filename },
    });
    return { success: true };
  },
};
