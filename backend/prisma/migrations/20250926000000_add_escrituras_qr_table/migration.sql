-- CreateTable
CREATE TABLE "escrituras_qr" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "numeroEscritura" TEXT,
    "datosCompletos" TEXT,
    "archivoOriginal" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "escrituras_qr_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "escrituras_qr_token_key" ON "escrituras_qr"("token");

-- CreateIndex
CREATE INDEX "escrituras_qr_token_idx" ON "escrituras_qr"("token");

-- CreateIndex
CREATE INDEX "escrituras_qr_estado_idx" ON "escrituras_qr"("estado");

-- CreateIndex
CREATE INDEX "escrituras_qr_createdAt_idx" ON "escrituras_qr"("createdAt");

-- CreateIndex
CREATE INDEX "escrituras_qr_createdBy_idx" ON "escrituras_qr"("createdBy");