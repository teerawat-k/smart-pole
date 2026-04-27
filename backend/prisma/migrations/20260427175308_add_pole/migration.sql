-- CreateEnum
CREATE TYPE "PoleStatus" AS ENUM ('online', 'offline', 'unknown', 'maintenance');

-- CreateTable
CREATE TABLE "poles" (
    "id" SERIAL NOT NULL,
    "poleName" TEXT NOT NULL,
    "installPlace" TEXT NOT NULL,
    "ddnsHostname" TEXT,
    "ipCamera" TEXT,
    "cameraModel" TEXT DEFAULT 'Dahua IPC-HFW5442E-ZE',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "hasCamera" BOOLEAN NOT NULL DEFAULT false,
    "hasPm25Sensor" BOOLEAN NOT NULL DEFAULT false,
    "hasTempHumidity" BOOLEAN NOT NULL DEFAULT false,
    "hasLed" BOOLEAN NOT NULL DEFAULT false,
    "poleStatus" "PoleStatus" NOT NULL DEFAULT 'unknown',
    "lastSeenAt" TIMESTAMP(3),
    "maintenanceReason" TEXT,
    "mqttUsername" TEXT NOT NULL,
    "mqttPasswordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "poles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "poles_poleName_key" ON "poles"("poleName");

-- CreateIndex
CREATE UNIQUE INDEX "poles_ddnsHostname_key" ON "poles"("ddnsHostname");

-- CreateIndex
CREATE UNIQUE INDEX "poles_mqttUsername_key" ON "poles"("mqttUsername");

-- CreateIndex
CREATE INDEX "poles_poleStatus_lastSeenAt_idx" ON "poles"("poleStatus", "lastSeenAt");

-- CreateIndex
CREATE INDEX "poles_deletedAt_idx" ON "poles"("deletedAt");
