-- Fase 1: Fundacion tenant + Clerk mapping (piloto N18)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) SUPER_ADMIN en enum de roles
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

-- 2) Tabla base de notarias
CREATE TABLE IF NOT EXISTS "notaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruc" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "clerk_org_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notaries_pkey" PRIMARY KEY ("id")
);

-- Compatibilidad con esquemas legacy (camelCase) previos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'isActive'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE "notaries" RENAME COLUMN "isActive" TO "is_active";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'createdAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE "notaries" RENAME COLUMN "createdAt" TO "created_at";
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'updatedAt'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "notaries" RENAME COLUMN "updatedAt" TO "updated_at";
  END IF;
END $$;

-- Desacoplar FK legacy antes de convertir notaries.id a UUID.
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_notaryId_fkey";
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'audit_logs'
  ) THEN
    ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_notaryId_fkey";
  END IF;
END $$;

-- Si id venia como texto en legacy, convertir a UUID de forma segura.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notaries'
      AND column_name = 'id'
      AND data_type IN ('text', 'character varying')
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM "notaries"
      WHERE "id" IS NOT NULL
        AND "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    ) THEN
      RAISE EXCEPTION 'No se puede convertir notaries.id a UUID: existen ids no validos';
    END IF;

    ALTER TABLE "notaries"
      ALTER COLUMN "id" TYPE UUID
      USING "id"::uuid;
  END IF;
END $$;

ALTER TABLE "notaries" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "notaries" ADD COLUMN IF NOT EXISTS "clerk_org_id" TEXT;
ALTER TABLE "notaries" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE "notaries" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
ALTER TABLE "notaries" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3);
ALTER TABLE "notaries" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);

UPDATE "notaries"
SET
  "is_active" = COALESCE("is_active", true),
  "created_at" = COALESCE("created_at", CURRENT_TIMESTAMP),
  "updated_at" = COALESCE("updated_at", CURRENT_TIMESTAMP);

ALTER TABLE "notaries" ALTER COLUMN "is_active" SET DEFAULT true;
ALTER TABLE "notaries" ALTER COLUMN "is_active" SET NOT NULL;
ALTER TABLE "notaries" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notaries" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "notaries" ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "notaries" ALTER COLUMN "updated_at" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "notaries_code_key" ON "notaries"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "notaries_slug_key" ON "notaries"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "notaries_clerk_org_id_key" ON "notaries"("clerk_org_id");
CREATE INDEX IF NOT EXISTS "notaries_is_active_idx" ON "notaries"("is_active");
CREATE INDEX IF NOT EXISTS "notaries_deleted_at_idx" ON "notaries"("deleted_at");

-- 3) Campos tenant/clerk/soft-delete en users
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_notaryId_fkey";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'notaryId'
      AND data_type IN ('text', 'character varying')
  ) THEN
    UPDATE "users"
    SET "notaryId" = NULL
    WHERE "notaryId" IS NOT NULL
      AND "notaryId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    ALTER TABLE "users"
      ALTER COLUMN "notaryId" TYPE UUID
      USING NULLIF("notaryId", '')::uuid;
  END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "clerk_user_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notary_id" UUID;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'notaryId'
  ) THEN
    UPDATE "users"
    SET "notary_id" = "notaryId"::uuid
    WHERE "notary_id" IS NULL
      AND "notaryId" IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_notary_id_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_notary_id_fkey"
      FOREIGN KEY ("notary_id") REFERENCES "notaries"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'notaryId'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_notaryId_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_notaryId_fkey"
      FOREIGN KEY ("notaryId") REFERENCES "notaries"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "users_clerk_user_id_key" ON "users"("clerk_user_id");
CREATE INDEX IF NOT EXISTS "users_notary_id_idx" ON "users"("notary_id");
CREATE INDEX IF NOT EXISTS "users_deleted_at_idx" ON "users"("deleted_at");

-- 4) Seed piloto N18 (idempotente)
INSERT INTO "notaries" (
  "code",
  "slug",
  "name",
  "ruc",
  "address",
  "city",
  "province",
  "phone",
  "email",
  "is_active"
) VALUES (
  'N18',
  'n18',
  'Notaria 18 del Canton Quito',
  '1768038930001',
  'Av. Amazonas y Naciones Unidas',
  'Quito',
  'Pichincha',
  '0999999999',
  'info@notaria18.com.ec',
  true
)
ON CONFLICT ("code") DO UPDATE
SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "ruc" = EXCLUDED."ruc",
  "address" = EXCLUDED."address",
  "city" = EXCLUDED."city",
  "province" = EXCLUDED."province",
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "is_active" = true,
  "deleted_at" = NULL,
  "updated_at" = CURRENT_TIMESTAMP;

WITH n18 AS (
  SELECT "id"
  FROM "notaries"
  WHERE "code" = 'N18'
)
UPDATE "users"
SET "notary_id" = (SELECT "id" FROM n18)
WHERE "notary_id" IS NULL
  AND "role"::text <> 'SUPER_ADMIN';

UPDATE "users"
SET "notary_id" = NULL
WHERE "role"::text = 'SUPER_ADMIN';
