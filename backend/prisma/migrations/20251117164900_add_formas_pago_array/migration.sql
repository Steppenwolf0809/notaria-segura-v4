-- AlterTable
-- Renombrar formaPago a formasPago (SQLite)

-- SQLite no soporta ALTER COLUMN directamente, así que usamos tabla temporal
PRAGMA foreign_keys=off;

BEGIN TRANSACTION;

-- Crear tabla temporal con la nueva estructura
CREATE TABLE "protocolos_uafe_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroProtocolo" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "actoContrato" TEXT NOT NULL,
    "avaluoMunicipal" DECIMAL(12, 2),
    "valorContrato" DECIMAL(12, 2) NOT NULL,
    "formasPago" TEXT,
    "createdBy" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "protocolos_uafe_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Copiar datos existentes (formaPago pasa a formasPago, se manejará conversión en el backend)
INSERT INTO "protocolos_uafe_new"
SELECT "id", "numeroProtocolo", "fecha", "actoContrato", "avaluoMunicipal", "valorContrato",
       "formaPago" as "formasPago", "createdBy", "createdAt", "updatedAt"
FROM "protocolos_uafe";

-- Eliminar tabla antigua
DROP TABLE "protocolos_uafe";

-- Renombrar tabla nueva
ALTER TABLE "protocolos_uafe_new" RENAME TO "protocolos_uafe";

-- Recrear índices
CREATE UNIQUE INDEX "protocolos_uafe_numeroProtocolo_key" ON "protocolos_uafe"("numeroProtocolo");
CREATE INDEX "protocolos_uafe_numeroProtocolo_idx" ON "protocolos_uafe"("numeroProtocolo");
CREATE INDEX "protocolos_uafe_createdBy_idx" ON "protocolos_uafe"("createdBy");
CREATE INDEX "protocolos_uafe_createdAt_idx" ON "protocolos_uafe"("createdAt");

COMMIT;

PRAGMA foreign_keys=on;
