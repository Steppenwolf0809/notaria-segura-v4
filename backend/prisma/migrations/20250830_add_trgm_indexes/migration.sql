-- Enable pg_trgm for trigram indexes (safe if already exists)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram GIN index for clientName
CREATE INDEX IF NOT EXISTS idx_documents_clientName_trgm
ON documents USING GIN ("clientName" gin_trgm_ops);

-- Trigram GIN index for protocolNumber (acts as code)
CREATE INDEX IF NOT EXISTS idx_documents_protocolNumber_trgm
ON documents USING GIN ("protocolNumber" gin_trgm_ops);

