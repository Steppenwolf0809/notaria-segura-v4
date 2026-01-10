-- Migration: Remove obsolete manual grouping columns
-- These columns are no longer used - grouping is now automatic by clientId

-- Drop indexes first if they exist
DROP INDEX IF EXISTS "documents_documentGroupId_idx";
DROP INDEX IF EXISTS "documents_documentGroupId_status_idx";

-- Remove obsolete columns from documents table
ALTER TABLE "documents" DROP COLUMN IF EXISTS "documentGroupId";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "isGrouped";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupLeaderId";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupPosition";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupVerificationCode";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupCreatedAt";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupCreatedBy";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupDeliveredAt";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "groupDeliveredTo";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "individualDelivered";
ALTER TABLE "documents" DROP COLUMN IF EXISTS "notificationPolicy";

-- Add mensajeInterno field for internal alerts if not exists
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "mensajeInterno" TEXT;
