-- CreateTable: Crear tabla de auditoría para verificaciones de QR
-- Esta tabla registra cada acceso/escaneo de un QR de escritura

CREATE TABLE "verificaciones_qr" (
    "id" SERIAL NOT NULL,
    "escrituraQRId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,
    "tipoVerificacion" TEXT NOT NULL,
    "country" TEXT,
    "city" TEXT,
    "duracionSegundos" INTEGER,

    CONSTRAINT "verificaciones_qr_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Índice compuesto para buscar verificaciones de un QR específico
CREATE INDEX "verificaciones_qr_escrituraQRId_timestamp_idx" ON "verificaciones_qr"("escrituraQRId", "timestamp");

-- CreateIndex: Índice por timestamp para reportes temporales
CREATE INDEX "verificaciones_qr_timestamp_idx" ON "verificaciones_qr"("timestamp");

-- CreateIndex: Índice por tipo de verificación
CREATE INDEX "verificaciones_qr_tipoVerificacion_idx" ON "verificaciones_qr"("tipoVerificacion");

-- CreateIndex: Índice por país para reportes geográficos
CREATE INDEX "verificaciones_qr_country_idx" ON "verificaciones_qr"("country");

-- AddForeignKey: Relación con escrituras_qr
ALTER TABLE "verificaciones_qr" ADD CONSTRAINT "verificaciones_qr_escrituraQRId_fkey" FOREIGN KEY ("escrituraQRId") REFERENCES "escrituras_qr"("id") ON DELETE CASCADE ON UPDATE CASCADE;
