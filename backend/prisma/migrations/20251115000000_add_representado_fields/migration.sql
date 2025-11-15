-- AlterTable: Add representado fields to PersonaProtocolo
-- Agregar campo representadoId (FK a PersonaRegistrada - si el representado existe en BD)
ALTER TABLE "personas_protocolo" ADD COLUMN "representadoId" TEXT;

-- Agregar campo datosRepresentado (JSON - si el representado NO existe en BD)
ALTER TABLE "personas_protocolo" ADD COLUMN "datosRepresentado" JSONB;

-- CreateIndex: Index on representadoId for performance
CREATE INDEX "personas_protocolo_representadoId_idx" ON "personas_protocolo"("representadoId");

-- AddForeignKey: PersonaProtocolo -> PersonaRegistrada (representado)
ALTER TABLE "personas_protocolo" ADD CONSTRAINT "personas_protocolo_representadoId_fkey"
    FOREIGN KEY ("representadoId") REFERENCES "personas_registradas"("numeroIdentificacion")
    ON DELETE SET NULL ON UPDATE CASCADE;
