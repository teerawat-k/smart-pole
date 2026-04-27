-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('info', 'warning', 'critical');

-- CreateTable
CREATE TABLE "alerts" (
    "id" SERIAL NOT NULL,
    "poleId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'warning',
    "message" TEXT NOT NULL,
    "value" DECIMAL(12,4),
    "threshold" DECIMAL(12,4),
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" INTEGER,
    "resolvedNote" TEXT,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_recordings" (
    "id" BIGSERIAL NOT NULL,
    "poleId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "recordedDate" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "fileSizeBytes" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL DEFAULT 0,
    "updatedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "video_recordings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alerts_poleId_isResolved_triggeredAt_idx" ON "alerts"("poleId", "isResolved", "triggeredAt" DESC);

-- CreateIndex
CREATE INDEX "alerts_severity_idx" ON "alerts"("severity");

-- CreateIndex
CREATE INDEX "alerts_alertType_idx" ON "alerts"("alertType");

-- CreateIndex
CREATE UNIQUE INDEX "video_recordings_filename_key" ON "video_recordings"("filename");

-- CreateIndex
CREATE INDEX "video_recordings_poleId_recordedDate_idx" ON "video_recordings"("poleId", "recordedDate" DESC);

-- CreateIndex
CREATE INDEX "video_recordings_deletedAt_idx" ON "video_recordings"("deletedAt");
