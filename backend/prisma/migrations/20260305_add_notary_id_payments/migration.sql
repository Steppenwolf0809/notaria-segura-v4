-- Add notary_id to payments table (multi-tenant)
ALTER TABLE "payments" ADD COLUMN "notary_id" INT NOT NULL DEFAULT 1 REFERENCES notaries(id);
CREATE INDEX IF NOT EXISTS idx_payments_notary_id ON payments(notary_id);
