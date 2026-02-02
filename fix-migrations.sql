-- Fix migration issues in production database
-- 1. First, mark the failed migration as rolled back
-- 2. Fix the payments_receiptNumber_key constraint issue
-- 3. Re-run migrations

-- Step 1: Check current migration status
SELECT * FROM "_prisma_migrations" WHERE migration_name = '20260106000000_add_pdf_fields_to_escrituras';

-- Step 2: Mark the failed migration as rolled back (so it can be re-applied)
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), 
    applied_steps_count = 0,
    logs = 'Rolled back manually due to failed state'
WHERE migration_name = '20260106000000_add_pdf_fields_to_escrituras' 
AND finished_at IS NULL;

-- Step 3: Drop the constraint that's causing issues (if it exists)
-- This allows the migration to proceed
DO $$
BEGIN
    -- Drop the constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'payments_receiptNumber_key' 
        AND conrelid = 'payments'::regclass
    ) THEN
        ALTER TABLE payments DROP CONSTRAINT payments_receiptNumber_key;
        RAISE NOTICE 'Dropped constraint payments_receiptNumber_key';
    END IF;
    
    -- Drop the index if it exists separately
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'payments_receiptNumber_key'
    ) THEN
        DROP INDEX IF EXISTS payments_receiptNumber_key;
        RAISE NOTICE 'Dropped index payments_receiptNumber_key';
    END IF;
END $$;

-- Step 4: Verify the migration is marked as resolved
SELECT * FROM "_prisma_migrations" 
WHERE migration_name = '20260106000000_add_pdf_fields_to_escrituras';
