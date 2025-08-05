-- Agregar campo de identificación del cliente (cédula/RUC)
-- para mejorar la detección de agrupación de documentos

ALTER TABLE "documents" ADD COLUMN "clientRuc" TEXT;

-- Comentario: Campo para almacenar cédula o RUC del cliente
-- Esto ayudará a distinguir entre clientes homónimos
-- y mejorar la precisión de la agrupación automática