/**
 * Utilidades para WhatsApp Click-to-Chat (wa.me)
 * Sistema de notificaciones de la Notaría
 */

/**
 * Formatear teléfono ecuatoriano para WhatsApp
 * @param {string} phone - Número natural (ej: "0987654321" o "987654321")
 * @returns {string|null} Número formateado (ej: "593987654321") o null si inválido
 */
export function formatPhoneForWhatsApp(phone) {
    if (!phone) return null;

    // Limpiar caracteres no numéricos
    let cleaned = phone.toString().replace(/[\s\-\(\)\+]/g, '');

    // Si empieza con 0, quitar el 0 y agregar 593
    if (cleaned.startsWith('0')) {
        cleaned = '593' + cleaned.substring(1);
    }
    // Si no tiene código de país, agregar 593
    else if (cleaned.length === 9) {
        cleaned = '593' + cleaned;
    }
    // Si ya tiene 593 al inicio, dejarlo
    else if (!cleaned.startsWith('593')) {
        cleaned = '593' + cleaned;
    }

    // Validar longitud (593 + 9 dígitos = 12)
    if (cleaned.length !== 12) {
        console.warn(`Número de teléfono inválido: ${phone} -> ${cleaned}`);
        return null;
    }

    return cleaned;
}

/**
 * Agrupar documentos por cliente de forma inteligente
 * Separa documentos listos de pendientes para anti-spam
 * @param {Array} documents - Lista de documentos
 * @returns {Object} { byClient: { [phone]: { clientName, documents } }, withoutPhone: [] }
 */
export function groupDocumentsByClient(documents) {
    if (!documents || !Array.isArray(documents)) {
        return [];
    }

    const byPhone = {};
    const withoutPhone = [];

    for (const doc of documents) {
        if (doc.clientPhone && doc.clientPhone.trim()) {
            const phone = doc.clientPhone.trim();
            if (!byPhone[phone]) {
                byPhone[phone] = {
                    cliente: {
                        nombre: doc.clientName,
                        identificacion: doc.clientId,
                        telefono: phone
                    },
                    documentos: [],
                    stats: {
                        total: 0,
                        ready: 0
                    }
                };
            }
            byPhone[phone].documentos.push(doc);
        } else {
            withoutPhone.push(doc);
        }
    }

    // Convert object to array
    const groups = Object.values(byPhone);

    // Add documents without phone as individual groups or a special group
    if (withoutPhone.length > 0) {
        // Option A: Individual groups for those without phone (better for searching)
        for (const doc of withoutPhone) {
            groups.push({
                cliente: {
                    nombre: doc.clientName,
                    identificacion: doc.clientId,
                    telefono: null
                },
                documentos: [doc],
                stats: {
                    total: 1,
                    ready: doc.status === 'LISTO' || doc.status === 'LISTO_ENTREGA' ? 1 : 0
                }
            });
        }
    }

    return groups;
}

/**
 * Separar documentos listos de pendientes dentro de un grupo
 * @param {Array} documents - Documentos del mismo cliente
 * @returns {Object} { listos: [], pendientes: [] }
 */
export function separateReadyDocuments(documents) {
    const listos = documents.filter(doc =>
        doc.status === 'LISTO' || doc.status === 'LISTO_ENTREGA'
    );
    const pendientes = documents.filter(doc =>
        doc.status !== 'LISTO' && doc.status !== 'LISTO_ENTREGA' && doc.status !== 'ENTREGADO'
    );

    return { listos, pendientes };
}

/**
 * Generar texto con lista de documentos para la URL WhatsApp
 * @param {Array} documents - Documentos a listar
 * @returns {string} Texto formateado para WhatsApp
 */
export function generateDocumentListText(documents) {
    if (!documents || documents.length === 0) return '';

    return documents.map(doc => {
        const tipo = doc.documentType || 'Documento';
        const protocolo = doc.protocolNumber || '';
        const detalle = doc.detalle_documento ? ` - ${doc.detalle_documento}` : '';
        return `• ${tipo}${protocolo ? ` (${protocolo})` : ''}${detalle}`;
    }).join('\n');
}

/**
 * Rellenar template con variables
 * Variables soportadas: {{CLIENTE}}, {{DOCUMENTOS}}, {{CODIGO_RETIRO}}, {{NOTARIA}}, {{DIRECCION}}, {{HORARIO}}
 * @param {string} template - Template con placeholders {{VARIABLE}}
 * @param {Object} data - Datos a inyectar
 * @returns {string} Mensaje formateado
 */
export function fillTemplate(template, data) {
    if (!template) return '';

    const defaults = {
        NOTARIA: 'NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO',
        DIRECCION: 'Azuay E2-231 y Av Amazonas, Quito',
        HORARIO: 'Lunes a Viernes 8:00-17:00'
    };

    const allData = { ...defaults, ...data };

    let result = template;
    for (const [key, value] of Object.entries(allData)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(regex, value || '');
    }

    return result;
}

/**
 * Generar URL wa.me completa para Click-to-Chat
 * @param {string} phone - Teléfono del destinatario
 * @param {string} message - Mensaje pre-llenado
 * @returns {string|null} URL wa.me o null si teléfono inválido
 */
export function generateWhatsAppUrl(phone, message) {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    if (!formattedPhone) return null;

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

/**
 * Generar mensaje estándar de documento listo
 * @param {Object} options - { clientName, documents, codigoRetiro }
 * @returns {string} Mensaje formateado para WhatsApp
 */
export function generateReadyMessage({ clientName, documents, codigoRetiro }) {
    const docList = generateDocumentListText(documents);
    const cantidad = documents.length;
    const plural = cantidad > 1 ? 's' : '';

    return `🏛️ *NOTARÍA DÉCIMO OCTAVA*

Estimado/a ${clientName},

Su${plural} documento${plural} está${cantidad > 1 ? 'n' : ''} listo${plural} para retiro:
${docList}

🔢 *Código de retiro:* ${codigoRetiro}

⚠️ Presente este código en ventanilla.
📍 Azuay E2-231 y Av Amazonas, Quito
⏰ Lunes a Viernes 8:00-17:00`;
}

/**
 * Verificar si un documento tiene los datos necesarios para notificación WhatsApp
 * @param {Object} document - Documento a verificar
 * @returns {Object} { canNotify: boolean, reason?: string }
 */
export function canNotifyDocument(document) {
    if (!document) {
        return { canNotify: false, reason: 'Documento no válido' };
    }

    if (!document.clientPhone || !document.clientPhone.trim()) {
        return { canNotify: false, reason: 'Cliente sin número de teléfono' };
    }

    const formattedPhone = formatPhoneForWhatsApp(document.clientPhone);
    if (!formattedPhone) {
        return { canNotify: false, reason: 'Número de teléfono inválido' };
    }

    if (!['LISTO', 'EN_PROCESO', 'LISTO_ENTREGA'].includes(document.status)) {
        return { canNotify: false, reason: `Estado no notificable: ${document.status}` };
    }

    return { canNotify: true };
}

export default {
    formatPhoneForWhatsApp,
    groupDocumentsByClient,
    separateReadyDocuments,
    generateDocumentListText,
    fillTemplate,
    generateWhatsAppUrl,
    generateReadyMessage,
    canNotifyDocument
};
