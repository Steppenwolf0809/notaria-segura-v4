-- AlterTable: Agregar campos para PDF completo en EscrituraQR
-- Estos campos permiten subir y servir el PDF completo de la escritura

-- Agregar campo para nombre del archivo PDF
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfFileName" TEXT;

-- Agregar campo para fecha de subida del PDF
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfUploadedAt" TIMESTAMP(3);

-- Agregar campo para ID del usuario que subió el PDF
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfUploadedBy" INTEGER;

-- Agregar campo para tamaño del archivo en bytes
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfFileSize" INTEGER;

-- Agregar campo contador de visualizaciones públicas
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfViewCount" INTEGER NOT NULL DEFAULT 0;

-- Comentario: Estos campos son opcionales (nullable) excepto pdfViewCount
-- pdfFileName: Nombre del archivo en FTP (ej: "TOKEN.pdf")
-- pdfUploadedAt: Timestamp de cuando se subió el PDF
-- pdfUploadedBy: FK al usuario matrizador que subió el PDF
-- pdfFileSize: Tamaño en bytes para validaciones y métricas
-- pdfViewCount: Contador de veces que se visualizó públicamente

