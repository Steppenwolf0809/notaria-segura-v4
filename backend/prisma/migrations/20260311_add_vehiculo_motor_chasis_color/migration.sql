-- AlterTable: add vehicle detail columns for UAFE vehicle form
ALTER TABLE "protocolos_uafe" ADD COLUMN "vehiculoMotor" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN "vehiculoChasis" TEXT;
ALTER TABLE "protocolos_uafe" ADD COLUMN "vehiculoColor" TEXT;
