import twilio from 'twilio';
import { parsePhoneNumber } from 'libphonenumber-js';
import prisma from '../db.js';
import { getActiveTemplateByType } from '../controllers/admin-whatsapp-templates-controller.js';
import { formatDateTime, formatTimeOnly, formatLongDateTime } from '../utils/timezone.js';

/**
 * Servicio WhatsApp para notificaciones de la notaría
 * Soporte para Sandbox Twilio y modo producción
 * Funcionalidad de simulación para desarrollo
 */
class WhatsAppService {
    constructor() {
        this.client = null;
        this.isEnabled = process.env.WHATSAPP_ENABLED === 'true';
        this.asyncMode = (process.env.WHATSAPP_ASYNC || 'true') !== 'false';
        // Compatibilidad: aceptar TWILIO_PHONE_NUMBER si TWILIO_WHATSAPP_FROM no está definido
        this.fromNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_PHONE_NUMBER;
        this.isDevelopment = process.env.NODE_ENV === 'development';

        // Configuración de la notaría
        this.notariaConfig = {
            nombre: process.env.NOTARIA_NOMBRE || "NOTARÍA DECIMO OCTAVA DEL CANTÓN QUITO",
            direccion: process.env.NOTARIA_DIRECCION || "Azuay E2-231 y Av Amazonas, Quito",
            horario: process.env.NOTARIA_HORARIO || "Lunes a Viernes 8:00-17:00"
        };

        if (this.isEnabled && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.client = twilio(
                    process.env.TWILIO_ACCOUNT_SID,
                    process.env.TWILIO_AUTH_TOKEN
                );
                console.log('✅ Cliente Twilio inicializado correctamente');
            } catch (error) {
                console.error('❌ Error inicializando cliente Twilio:', error);
                this.client = null;
            }
        } else {
            console.log('⚠️ WhatsApp deshabilitado o credenciales faltantes');
        }
    }

    /**
     * Guardar notificación en la base de datos
     */
    async saveNotification(data) {
        try {
            const notification = await prisma.whatsAppNotification.create({
                data: {
                    documentId: data.documentId || null,
                    clientName: data.clientName,
                    clientPhone: data.clientPhone,
                    messageType: data.messageType,
                    messageBody: data.messageBody,
                    status: data.status,
                    messageId: data.messageId || null,
                    errorMessage: data.errorMessage || null,
                    sentAt: data.status === 'SENT' ? new Date() : null
                }
            });

            console.log(`💾 Notificación guardada en BD: ${notification.id}`);
            return notification;
        } catch (error) {
            console.error('❌ Error guardando notificación:', error);
            return null;
        }
    }

    // Actualizar notificación existente
    async updateNotification(id, data) {
        try {
            return await prisma.whatsAppNotification.update({ where: { id }, data });
        } catch (error) {
            console.error('❌ Error actualizando notificación:', error);
            return null;
        }
    }

    // Envío con actualización de la notificación PENDING
    async _sendAndUpdate({ pendingId, numeroWhatsApp, mensaje }) {
        const result = await this.client.messages.create({
            from: this.fromNumber,
            to: numeroWhatsApp,
            body: mensaje
        });
        if (pendingId) {
            await this.updateNotification(pendingId, { status: 'SENT', messageId: result.sid, sentAt: new Date() });
        }
        return {
            success: true,
            messageId: result.sid,
            to: numeroWhatsApp,
            message: mensaje,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Formatear número de teléfono para WhatsApp
     * Soporta números ecuatorianos con/sin código de país
     */
    formatPhoneNumber(phoneNumber, countryCode = 'EC') {
        if (!phoneNumber) return null;
        try {
            // Limpiar el número (remover espacios, guiones, paréntesis)
            let cleanNumber = phoneNumber.toString().replace(/[\s\-\(\)]/g, '');

            // Si ya tiene el prefijo whatsapp:, devolverlo tal como está
            if (cleanNumber.startsWith('whatsapp:')) {
                return cleanNumber;
            }

            // Si ya tiene +, intentar parsear directamente
            if (cleanNumber.startsWith('+')) {
                const parsed = parsePhoneNumber(cleanNumber);
                if (parsed && parsed.isValid()) {
                    return `whatsapp:${parsed.number}`;
                }
            }

            // Para números ecuatorianos sin +593
            if (cleanNumber.length === 10 && cleanNumber.startsWith('0')) {
                // Remover el 0 inicial y agregar código de país
                cleanNumber = '593' + cleanNumber.substring(1);
            } else if (cleanNumber.length === 9) {
                // Número celular sin 0 inicial
                cleanNumber = '593' + cleanNumber;
            }

            // Agregar + si no lo tiene
            if (!cleanNumber.startsWith('+')) {
                cleanNumber = '+' + cleanNumber;
            }

            const parsed = parsePhoneNumber(cleanNumber, countryCode);
            if (parsed && parsed.isValid()) {
                return `whatsapp:${parsed.number}`;
            }

            console.warn(`⚠️ Número inválido: ${phoneNumber}`);
            return null;
        } catch (error) {
            console.error('❌ Error formateando número:', error);
            return null;
        }
    }

    /**
     * Verificar configuración del servicio
     */
    async verificarConfiguracion() {
        if (!this.isEnabled) {
            return {
                status: 'disabled',
                message: 'WhatsApp deshabilitado en configuración',
                config: {
                    enabled: false,
                    hasCredentials: false,
                    environment: process.env.NODE_ENV
                }
            };
        }

        if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
            return {
                status: 'error',
                message: 'Credenciales de Twilio faltantes',
                config: {
                    enabled: true,
                    hasCredentials: false,
                    environment: process.env.NODE_ENV
                }
            };
        }

        if (!this.client) {
            return {
                status: 'error',
                message: 'Cliente Twilio no inicializado',
                config: {
                    enabled: true,
                    hasCredentials: true,
                    clientInitialized: false,
                    environment: process.env.NODE_ENV
                }
            };
        }

        try {
            // Verificar credenciales con Twilio
            const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
            return {
                status: 'active',
                message: 'Configuración válida y funcional',
                config: {
                    enabled: true,
                    hasCredentials: true,
                    clientInitialized: true,
                    accountName: account.friendlyName,
                    environment: process.env.NODE_ENV,
                    fromNumber: this.fromNumber
                }
            };
        } catch (error) {
            return {
                status: 'error',
                message: 'Error validando credenciales con Twilio',
                error: error.message,
                config: {
                    enabled: true,
                    hasCredentials: true,
                    clientInitialized: true,
                    environment: process.env.NODE_ENV
                }
            };
        }
    }

    /**
     * Obtener estadísticas de uso (para dashboard)
     */
    getStats() {
        return {
            enabled: this.isEnabled,
            clientReady: !!this.client,
            environment: process.env.NODE_ENV,
            fromNumber: this.fromNumber
        };
    }
}

// Crear instancia singleton
const whatsappService = new WhatsAppService();

export default whatsappService;
