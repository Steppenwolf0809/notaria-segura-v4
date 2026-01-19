-- ============================================================================
-- Billing Module: Performance Indexes Migration
-- Sprint 7 - Task 7.8
-- ============================================================================
-- Purpose: Optimize billing-related queries with targeted indexes
-- Run: npx prisma db execute --file migrations/add_billing_indexes.sql
-- ============================================================================

-- Invoice table indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoice_client_tax_id ON "Invoice"("clientTaxId");
CREATE INDEX IF NOT EXISTS idx_invoice_status ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS idx_invoice_due_date ON "Invoice"("dueDate");
CREATE INDEX IF NOT EXISTS idx_invoice_issue_date ON "Invoice"("issueDate");
CREATE INDEX IF NOT EXISTS idx_invoice_document_id ON "Invoice"("documentId");

-- Composite index for pending invoices queries (most common)
CREATE INDEX IF NOT EXISTS idx_invoice_status_due_date ON "Invoice"("status", "dueDate");

-- Payment table indexes
CREATE INDEX IF NOT EXISTS idx_payment_invoice_id ON "Payment"("invoiceId");
CREATE INDEX IF NOT EXISTS idx_payment_date ON "Payment"("paymentDate");
CREATE INDEX IF NOT EXISTS idx_payment_receipt ON "Payment"("receiptNumber");

-- Import log indexes for audit trail
CREATE INDEX IF NOT EXISTS idx_import_log_type ON "ImportLog"("importType");
CREATE INDEX IF NOT EXISTS idx_import_log_created ON "ImportLog"("createdAt");

-- Document table indexes for billing joins
CREATE INDEX IF NOT EXISTS idx_documento_client_tax_id ON "Documento"("clientTaxId");
CREATE INDEX IF NOT EXISTS idx_documento_status ON "Documento"("status");
CREATE INDEX IF NOT EXISTS idx_documento_assigned_to ON "Documento"("assignedToId");

-- ============================================================================
-- Notes:
-- - These indexes improve query performance for reporting and lookups
-- - clientTaxId is heavily used for client balance and invoice lookups
-- - status + dueDate composite index speeds up "overdue invoices" queries
-- - Indexes on documentId/invoiceId improve JOIN performance
-- ============================================================================
