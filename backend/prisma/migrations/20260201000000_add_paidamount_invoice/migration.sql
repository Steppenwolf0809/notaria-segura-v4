-- AddPaidamountInvoice
-- ALTER TABLE "invoices" ADD COLUMN "paidAmount" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN "matrizador" TEXT;

-- Update existing records with calculated paidAmount
UPDATE "invoices" 
SET "paidAmount" = COALESCE((
    SELECT SUM(p.amount) 
    FROM payments p 
    WHERE p."invoiceId" = invoices.id
), 0);
