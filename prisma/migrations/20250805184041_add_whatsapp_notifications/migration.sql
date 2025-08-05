-- AlterTable
ALTER TABLE "documents" ADD COLUMN "clientRuc" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT,
    "groupId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "messageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "whatsapp_notifications_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "whatsapp_notifications_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "DocumentGroup" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
