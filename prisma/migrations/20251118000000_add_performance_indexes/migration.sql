-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_clientPhone_idx" ON "Document"("clientPhone");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_clientName_idx" ON "Document"("clientName");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Document_documentGroupId_idx" ON "Document"("documentGroupId");

-- CreateIndex (Composite)
CREATE INDEX IF NOT EXISTS "Document_assignedToId_status_idx" ON "Document"("assignedToId", "status");

-- CreateIndex (Composite)
CREATE INDEX IF NOT EXISTS "Document_documentGroupId_status_idx" ON "Document"("documentGroupId", "status");
