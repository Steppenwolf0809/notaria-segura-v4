-- Migration: Add WhatsApp Templates Table
-- Date: 2025-08-07
-- Description: Crear tabla templates_whatsapp para mensajes personalizables del admin

-- Crear tabla de templates WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    tipo TEXT NOT NULL CHECK(tipo IN ('DOCUMENTO_LISTO', 'DOCUMENTO_ENTREGADO')),
    titulo TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para búsquedas eficientes por tipo y activo
CREATE INDEX idx_whatsapp_templates_tipo_activo ON whatsapp_templates(tipo, activo);

-- Insertar templates por defecto
INSERT INTO whatsapp_templates (tipo, titulo, mensaje, activo) VALUES 
(
    'DOCUMENTO_LISTO',
    'Documento Listo para Retiro',
    '🏛️ *{notaria}*

Estimado/a {cliente},

Su documento está listo para retiro:
📄 *Documento:* {documento}
🔢 *Código de retiro:* {codigo}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

¡Gracias por confiar en nosotros!',
    TRUE
),
(
    'DOCUMENTO_ENTREGADO',
    'Confirmación de Entrega',
    '🏛️ *{notaria}*

Estimado/a {cliente},

✅ Confirmamos la entrega de su documento:
📄 *Documento:* {documento}
👤 *Retirado por:* {cliente}
📅 *Fecha y hora:* {fecha}

¡Gracias por confiar en nuestros servicios!',
    TRUE
);