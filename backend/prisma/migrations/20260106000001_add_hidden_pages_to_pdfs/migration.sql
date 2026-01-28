-- AlterTable: Agregar campo para páginas ocultas en PDFs
-- Este campo permite al matrizador ocultar páginas con datos sensibles (menores, etc.)

-- Agregar campo para array JSON de páginas ocultas
ALTER TABLE "escrituras_qr" ADD COLUMN "pdfHiddenPages" TEXT;

-- Comentario: 
-- pdfHiddenPages: Array JSON de números de página a ocultar
-- Ejemplo: "[2,5,7]" oculta las páginas 2, 5 y 7
-- NULL significa que todas las páginas son visibles
-- Útil para proteger datos sensibles de menores (cédulas, biométricos, etc.)

