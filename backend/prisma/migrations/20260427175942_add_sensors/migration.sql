-- CreateTable
CREATE TABLE "sensor_types" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "unit" TEXT,
    "tableName" TEXT NOT NULL,
    "chartType" TEXT,
    "chartColor" TEXT,
    "retentionDays" INTEGER NOT NULL DEFAULT 365,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "updatedBy" INTEGER,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" INTEGER,

    CONSTRAINT "sensor_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensor_pm25" (
    "time" TIMESTAMP(3) NOT NULL,
    "poleId" INTEGER NOT NULL,
    "seq" BIGINT NOT NULL,
    "pm25" DOUBLE PRECISION NOT NULL,
    "pm10" DOUBLE PRECISION,
    "aqi" INTEGER,
    "rawJson" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_pm25_pkey" PRIMARY KEY ("time","poleId")
);

-- CreateTable
CREATE TABLE "sensor_temperature" (
    "time" TIMESTAMP(3) NOT NULL,
    "poleId" INTEGER NOT NULL,
    "seq" BIGINT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'celsius',
    "rawJson" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_temperature_pkey" PRIMARY KEY ("time","poleId")
);

-- CreateTable
CREATE TABLE "sensor_humidity" (
    "time" TIMESTAMP(3) NOT NULL,
    "poleId" INTEGER NOT NULL,
    "seq" BIGINT NOT NULL,
    "humidity" DOUBLE PRECISION NOT NULL,
    "rawJson" JSONB,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_humidity_pkey" PRIMARY KEY ("time","poleId")
);

-- CreateTable
CREATE TABLE "sensor_heartbeat_signal" (
    "time" TIMESTAMP(3) NOT NULL,
    "poleId" INTEGER NOT NULL,
    "signalDbm" INTEGER,
    "uptimeSec" BIGINT,
    "firmwareVersion" TEXT,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_heartbeat_signal_pkey" PRIMARY KEY ("time","poleId")
);

-- CreateTable
CREATE TABLE "sensor_unknown" (
    "id" BIGSERIAL NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "poleId" INTEGER NOT NULL,
    "sensorKey" TEXT NOT NULL,
    "rawJson" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "ingestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sensor_unknown_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sensor_types_key_key" ON "sensor_types"("key");

-- CreateIndex
CREATE INDEX "sensor_pm25_poleId_time_idx" ON "sensor_pm25"("poleId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_temperature_poleId_time_idx" ON "sensor_temperature"("poleId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_humidity_poleId_time_idx" ON "sensor_humidity"("poleId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_heartbeat_signal_poleId_time_idx" ON "sensor_heartbeat_signal"("poleId", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_unknown_sensorKey_time_idx" ON "sensor_unknown"("sensorKey", "time" DESC);

-- CreateIndex
CREATE INDEX "sensor_unknown_poleId_time_idx" ON "sensor_unknown"("poleId", "time" DESC);
