-- AlterTable: Agregar campo assignedToId a Invoice para asignar matrizador directamente
ALTER TABLE "invoices" ADD COLUMN "assignedToId" INTEGER;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "invoices_assignedToId_idx" ON "invoices"("assignedToId");
