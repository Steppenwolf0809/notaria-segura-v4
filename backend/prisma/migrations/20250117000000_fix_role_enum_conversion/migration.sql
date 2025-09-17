-- Fix role enum conversion migration
-- Generated: 2025-01-17T00:00:00.000Z
-- This migration converts the role column from String to UserRole enum

-- Create the UserRole enum type
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO');

-- Convert existing string values to enum values
-- Handle case-insensitive matching and normalize values
UPDATE "users"
SET role = CASE
  WHEN UPPER(TRIM(role)) = 'ADMIN' THEN 'ADMIN'::"UserRole"
  WHEN UPPER(TRIM(role)) = 'CAJA' THEN 'CAJA'::"UserRole"
  WHEN UPPER(TRIM(role)) LIKE '%MATRIZADOR%' THEN 'MATRIZADOR'::"UserRole"
  WHEN UPPER(TRIM(role)) LIKE '%RECEPCION%' THEN 'RECEPCION'::"UserRole"
  WHEN UPPER(TRIM(role)) LIKE '%ARCHIVO%' THEN 'ARCHIVO'::"UserRole"
  -- Default fallback for unrecognized values
  ELSE 'MATRIZADOR'::"UserRole"
END;

-- Change the column type from TEXT to UserRole enum
ALTER TABLE "users" ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";

-- Add a check constraint to ensure only valid enum values
ALTER TABLE "users" ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'CAJA', 'MATRIZADOR', 'RECEPCION', 'ARCHIVO'));