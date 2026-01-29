-- Migration: add_billing_models
-- Date: 2026-01-17
-- Description: Add Invoice, Payment, and ImportLog models for billing module

-- Create enums first
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'TRANSFER', 'CHECK', 'RETENTION', 'CREDIT_NOTE', 'OTHER');
CREATE TYPE "ImportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- Create invoices table
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceNumberRaw" TEXT NOT NULL,
    "clientTaxId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "concept" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "documentId" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFile" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Create payments table
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "concept" TEXT,
    "accountingRef" TEXT,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'CASH',
    "invoiceId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceFile" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- Create import_logs table
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "invoicesCreated" INTEGER NOT NULL DEFAULT 0,
    "invoicesUpdated" INTEGER NOT NULL DEFAULT 0,
    "paymentsCreated" INTEGER NOT NULL DEFAULT 0,
    "paymentsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "status" "ImportStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorDetails" JSONB,
    "executedBy" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber");


-- Add foreign key constraints
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for invoices
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");
CREATE INDEX "invoices_clientTaxId_idx" ON "invoices"("clientTaxId");
CREATE INDEX "invoices_status_idx" ON "invoices"("status");
CREATE INDEX "invoices_issueDate_idx" ON "invoices"("issueDate");
CREATE INDEX "invoices_documentId_idx" ON "invoices"("documentId");

-- Create indexes for payments
CREATE INDEX "payments_receiptNumber_idx" ON "payments"("receiptNumber");
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");
CREATE INDEX "payments_paymentDate_idx" ON "payments"("paymentDate");

-- Create indexes for import_logs
CREATE INDEX "import_logs_status_idx" ON "import_logs"("status");
CREATE INDEX "import_logs_startedAt_idx" ON "import_logs"("startedAt");
