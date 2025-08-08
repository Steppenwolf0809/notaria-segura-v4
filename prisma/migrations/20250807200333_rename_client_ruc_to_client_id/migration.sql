/*
  Warnings:

  - You are about to drop the column `clientRuc` on the `documents` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "protocolNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "clientId" TEXT,
    "detalle_documento" TEXT,
    "comentarios_recepcion" TEXT,
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
    "documentGroupId" TEXT,
    "isGrouped" BOOLEAN NOT NULL DEFAULT false,
    "groupLeaderId" TEXT,
    "groupPosition" INTEGER,
    "groupVerificationCode" TEXT,
    "groupCreatedAt" DATETIME,
    "groupCreatedBy" TEXT,
    "groupDeliveredAt" DATETIME,
    "groupDeliveredTo" TEXT,
    "individualDelivered" BOOLEAN NOT NULL DEFAULT false,
    "codigoRetiro" TEXT,
    "entregadoA" TEXT,
    "cedulaReceptor" TEXT,
    "relacionTitular" TEXT,
    "verificacionManual" BOOLEAN NOT NULL DEFAULT false,
    "facturaPresenta" BOOLEAN NOT NULL DEFAULT false,
    "fechaEntrega" DATETIME,
    "usuarioEntregaId" INTEGER,
    "observacionesEntrega" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "documents_usuarioEntregaId_fkey" FOREIGN KEY ("usuarioEntregaId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "documents_documentGroupId_fkey" FOREIGN KEY ("documentGroupId") REFERENCES "DocumentGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_documents" ("actoPrincipalDescripcion", "actoPrincipalValor", "assignedToId", "cedulaReceptor", "clientEmail", "clientName", "clientPhone", "codigoRetiro", "comentarios_recepcion", "createdAt", "createdById", "detalle_documento", "documentGroupId", "documentType", "entregadoA", "facturaPresenta", "fechaEntrega", "groupCreatedAt", "groupCreatedBy", "groupDeliveredAt", "groupDeliveredTo", "groupLeaderId", "groupPosition", "groupVerificationCode", "id", "individualDelivered", "isGrouped", "itemsSecundarios", "matrizadorName", "observacionesEntrega", "protocolNumber", "relacionTitular", "status", "totalFactura", "updatedAt", "usuarioEntregaId", "verificacionManual", "verificationCode", "xmlOriginal") SELECT "actoPrincipalDescripcion", "actoPrincipalValor", "assignedToId", "cedulaReceptor", "clientEmail", "clientName", "clientPhone", "codigoRetiro", "comentarios_recepcion", "createdAt", "createdById", "detalle_documento", "documentGroupId", "documentType", "entregadoA", "facturaPresenta", "fechaEntrega", "groupCreatedAt", "groupCreatedBy", "groupDeliveredAt", "groupDeliveredTo", "groupLeaderId", "groupPosition", "groupVerificationCode", "id", "individualDelivered", "isGrouped", "itemsSecundarios", "matrizadorName", "observacionesEntrega", "protocolNumber", "relacionTitular", "status", "totalFactura", "updatedAt", "usuarioEntregaId", "verificacionManual", "verificationCode", "xmlOriginal" FROM "documents";
DROP TABLE "documents";
ALTER TABLE "new_documents" RENAME TO "documents";
CREATE UNIQUE INDEX "documents_protocolNumber_key" ON "documents"("protocolNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
