-- Sensor Push: state ต่อ pole + receiver (anchor / last-pushed / circuit-breaker)
-- additive — เพิ่ม table เปล่า zero-downtime · ไม่แตะ table เดิม

-- CreateTable
CREATE TABLE "PushState" (
    "id" SERIAL NOT NULL,
    "poleId" INTEGER NOT NULL,
    "receiverKey" TEXT NOT NULL,
    "anchorAt" BIGINT,
    "nextPushAt" BIGINT,
    "lastPushedSeq" BIGINT,
    "lastPushedAt" BIGINT,
    "circuitState" TEXT NOT NULL DEFAULT 'closed',
    "circuitFailCount" INTEGER NOT NULL DEFAULT 0,
    "circuitOpenedAt" BIGINT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PushState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushState_poleId_receiverKey_key" ON "PushState"("poleId", "receiverKey");
CREATE INDEX "PushState_poleId_idx" ON "PushState"("poleId");

-- AddForeignKey
ALTER TABLE "PushState" ADD CONSTRAINT "PushState_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "Pole"("id") ON DELETE CASCADE ON UPDATE CASCADE;
