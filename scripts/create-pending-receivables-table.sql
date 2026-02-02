-- Crear tabla pending_receivables con campo matrizadorName
CREATE TABLE IF NOT EXISTS "pending_receivables" (
  "id" TEXT NOT NULL,
  "clientTaxId" TEXT NOT NULL,
  "clientName" TEXT NOT NULL,
  "invoiceNumberRaw" TEXT NOT NULL,
  "invoiceNumber" TEXT,
  "totalAmount" DECIMAL(12,2) NOT NULL,
  "balance" DECIMAL(12,2) NOT NULL,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "issueDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "daysOverdue" INTEGER NOT NULL DEFAULT 0,
  "matrizadorName" TEXT,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sourceFile" TEXT NOT NULL,
  "reportDate" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pending_receivables_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS "pending_receivables_invoiceNumberRaw_reportDate_key" 
  ON "pending_receivables"("invoiceNumberRaw", "reportDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_clientTaxId_idx" 
  ON "pending_receivables"("clientTaxId");

CREATE INDEX IF NOT EXISTS "pending_receivables_dueDate_idx" 
  ON "pending_receivables"("dueDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_balance_idx" 
  ON "pending_receivables"("balance");

CREATE INDEX IF NOT EXISTS "pending_receivables_status_idx" 
  ON "pending_receivables"("status");

CREATE INDEX IF NOT EXISTS "pending_receivables_reportDate_idx" 
  ON "pending_receivables"("reportDate");

CREATE INDEX IF NOT EXISTS "pending_receivables_matrizadorName_idx" 
  ON "pending_receivables"("matrizadorName");
