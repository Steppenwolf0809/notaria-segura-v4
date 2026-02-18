-- Add operational comments from Caja on CXC receivables
ALTER TABLE "pending_receivables"
ADD COLUMN IF NOT EXISTS "cashierComment" TEXT,
ADD COLUMN IF NOT EXISTS "cashierCommentUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cashierCommentUpdatedById" INTEGER,
ADD COLUMN IF NOT EXISTS "cashierCommentUpdatedByName" TEXT;

CREATE INDEX IF NOT EXISTS "pending_receivables_cashierCommentUpdatedAt_idx"
ON "pending_receivables"("cashierCommentUpdatedAt");
