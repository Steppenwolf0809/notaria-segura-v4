-- Prisma Migrate Baseline Migration
-- Generated: 2025-01-17T00:00:00.000Z
-- This migration represents the current state of the database schema
-- It should NOT be executed as it would attempt to recreate existing tables

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
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
    "actoPrincipalValor" DOUBLE PRECISION NOT NULL,
    "totalFactura" DOUBLE PRECISION NOT NULL,
    "matrizadorName" TEXT NOT NULL,
    "itemsSecundarios" TEXT,
    "xmlOriginal" TEXT,
    "documentGroupId" TEXT,
    "isGrouped" BOOLEAN NOT NULL DEFAULT false,
    "groupLeaderId" TEXT,
    "groupPosition" INTEGER,
    "groupVerificationCode" TEXT,
    "groupCreatedAt" TIMESTAMP(3),
    "groupCreatedBy" TEXT,
    "groupDeliveredAt" TIMESTAMP(3),
    "groupDeliveredTo" TEXT,
    "individualDelivered" BOOLEAN NOT NULL DEFAULT false,
    "notificationPolicy" TEXT NOT NULL DEFAULT 'automatica',
    "codigoRetiro" TEXT,
    "entregadoA" TEXT,
    "cedulaReceptor" TEXT,
    "relacionTitular" TEXT,
    "verificacionManual" BOOLEAN NOT NULL DEFAULT false,
    "facturaPresenta" BOOLEAN NOT NULL DEFAULT false,
    "fechaEntrega" TIMESTAMP(3),
    "usuarioEntregaId" INTEGER,
    "observacionesEntrega" TEXT,
    "notaCreditoMotivo" TEXT,
    "notaCreditoEstadoPrevio" TEXT,
    "notaCreditoFecha" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGroup" (
    "id" TEXT NOT NULL,
    "groupCode" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROCESS',
    "documentsCount" INTEGER NOT NULL,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_events" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "personaRetiro" TEXT,
    "cedulaRetiro" TEXT,
    "metodoVerificacion" TEXT,
    "observacionesRetiro" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "groupId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_templates" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_connection" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL DEFAULT 'Conexión exitosa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "test_connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concuerdo_audit_logs" (
    "id" TEXT NOT NULL,
    "docId" TEXT,
    "estructura" TEXT NOT NULL,
    "templateMode" TEXT NOT NULL,
    "force" TEXT NOT NULL,
    "hashConcuerdo" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" TEXT,

    CONSTRAINT "concuerdo_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "documents_protocolNumber_key" ON "documents"("protocolNumber");

-- CreateIndex
CREATE INDEX "documents_status_idx" ON "documents"("status");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "documents_updatedAt_idx" ON "documents"("updatedAt");

-- CreateIndex
CREATE INDEX "documents_assignedToId_idx" ON "documents"("assignedToId");

-- CreateIndex
CREATE INDEX "documents_documentGroupId_idx" ON "documents"("documentGroupId");

-- CreateIndex
CREATE INDEX "documents_assignedToId_status_idx" ON "documents"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "documents_documentGroupId_status_idx" ON "documents"("documentGroupId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentGroup_groupCode_key" ON "DocumentGroup"("groupCode");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentGroup_verificationCode_key" ON "DocumentGroup"("verificationCode");

-- CreateIndex
CREATE INDEX "document_events_documentId_createdAt_idx" ON "document_events"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "document_events_userId_idx" ON "document_events"("userId");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_status_idx" ON "whatsapp_notifications"("status");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_documentId_idx" ON "whatsapp_notifications"("documentId");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_groupId_idx" ON "whatsapp_notifications"("groupId");

-- CreateIndex
CREATE INDEX "whatsapp_notifications_createdAt_idx" ON "whatsapp_notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_key_idx" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "concuerdo_audit_logs_docId_idx" ON "concuerdo_audit_logs"("docId");

-- CreateIndex
CREATE INDEX "concuerdo_audit_logs_createdBy_idx" ON "concuerdo_audit_logs"("createdBy");

-- CreateIndex
CREATE INDEX "concuerdo_audit_logs_createdAt_idx" ON "concuerdo_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "concuerdo_audit_logs_estructura_idx" ON "concuerdo_audit_logs"("estructura");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_usuarioEntregaId_fkey" FOREIGN KEY ("usuarioEntregaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_documentGroupId_fkey" FOREIGN KEY ("documentGroupId") REFERENCES "DocumentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_notifications" ADD CONSTRAINT "whatsapp_notifications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DocumentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concuerdo_audit_logs" ADD CONSTRAINT "concuerdo_audit_logs_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concuerdo_audit_logs" ADD CONSTRAINT "concuerdo_audit_logs_docId_fkey" FOREIGN KEY ("docId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;