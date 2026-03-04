-- Add Clerk authentication fields to users table
-- Part of Clerk integration (replacing JWT homemade auth)

-- Add SUPER_ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN' BEFORE 'ADMIN';

-- Add clerkId field (unique, nullable for transition)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_clerkId_key" ON "users"("clerkId");

-- Make password nullable (Clerk handles passwords now)
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Make role nullable (new users from Clerk start without role until admin assigns)
ALTER TABLE "users" ALTER COLUMN "role" DROP NOT NULL;

-- Add isOnboarded field (false until admin assigns role + notary)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isOnboarded" BOOLEAN NOT NULL DEFAULT false;

-- Mark existing users as onboarded (they already have roles)
UPDATE "users" SET "isOnboarded" = true WHERE "role" IS NOT NULL;
