ALTER TABLE "Refund" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Refund" ADD COLUMN "requestedById" TEXT;
ALTER TABLE "Settlement" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Settlement" ADD COLUMN "initiatedById" TEXT;

CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");
CREATE UNIQUE INDEX "Settlement_idempotencyKey_key" ON "Settlement"("idempotencyKey");

CREATE TABLE "DisputeEvidence" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DisputeDecision" (
    "id" TEXT NOT NULL,
    "disputeId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeDecision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DisputeEvidence_disputeId_createdAt_idx" ON "DisputeEvidence"("disputeId", "createdAt");
CREATE INDEX "DisputeDecision_disputeId_createdAt_idx" ON "DisputeDecision"("disputeId", "createdAt");

ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DealDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisputeDecision" ADD CONSTRAINT "DisputeDecision_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DealDispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DisputeDecision" ADD CONSTRAINT "DisputeDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;