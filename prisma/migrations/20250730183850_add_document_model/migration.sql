-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "verificationCode" TEXT,
    "assignedToId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "actoPrincipalDescripcion" TEXT NOT NULL,
    "actoPrincipalValor" REAL NOT NULL,
    "totalFactura" REAL NOT NULL,
    "matrizadorName" TEXT NOT NULL,
    "itemsSecundarios" JSONB,
    "xmlOriginal" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_protocolNumber_key" ON "documents"("protocolNumber");
