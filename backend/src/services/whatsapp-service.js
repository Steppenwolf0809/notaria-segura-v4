import twilio from 'twilio';
import { parsePhoneNumber } from 'libphonenumber-js';
import { PrismaClient } from '@prisma/client';
import { getActiveTemplateByType } from '../controllers/admin-whatsapp-templates-controller.js';

const prisma = new PrismaClient();

/**
 * Servicio WhatsApp para notificaciones de la notaría
 * Soporte para Sandbox Twilio y modo producción
 * Funcionalidad de simulación para desarrollo
 */
class WhatsAppService {
    constructor() {
        this.client = null;
        this.isEnabled = process.env.WHATSAPP_ENABLED === 'true';
        this.fromNumber = process.env.TWILIO_WHATSAPP_FROM;
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
                    groupId: data.groupId || null,
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

    /**
     * Formatear número de teléfono para WhatsApp
     * Soporta números ecuatorianos con/sin código de país
     */
    formatPhoneNumber(phoneNumber, countryCode = 'EC') {
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
                    return `whatsapp:+${parsed.number}`;
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
     * Enviar mensaje de documento listo para retiro
     */
    async enviarDocumentoListo(cliente, documento, codigo) {
        const clientName = cliente.clientName || cliente.nombre;
        const clientPhone = cliente.clientPhone || cliente.telefono;
        // Usar template de BD o fallback a hardcodeado
        const mensaje = await this.generarMensajeDocumentoListoFromTemplate(cliente, documento, codigo);

        // Preparar datos para guardar en BD
        const notificationData = {
            documentId: documento.id || null,
            clientName: clientName,
            clientPhone: clientPhone,
            messageType: 'DOCUMENT_READY',
            messageBody: mensaje
        };

        if (!this.isEnabled || !this.client) {
            // Modo simulación
            const simulationResult = this.simularEnvio(cliente, documento, codigo, 'documento_listo');
            
            // Guardar como simulada
            await this.saveNotification({
                ...notificationData,
                status: 'SIMULATED',
                messageId: simulationResult.messageId
            });
            
            return simulationResult;
        }

        const numeroWhatsApp = this.formatPhoneNumber(clientPhone);
        if (!numeroWhatsApp) {
            // Guardar como error
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: `Número de teléfono inválido: ${clientPhone}`
            });
            throw new Error(`Número de teléfono inválido: ${clientPhone}`);
        }

        try {
            const result = await this.client.messages.create({
                from: this.fromNumber,
                to: numeroWhatsApp,
                body: mensaje
            });

            console.log(`📱 WhatsApp enviado: ${result.sid} → ${numeroWhatsApp}`);
            
            // Guardar como exitosa
            await this.saveNotification({
                ...notificationData,
                status: 'SENT',
                messageId: result.sid
            });

            return {
                success: true,
                messageId: result.sid,
                to: numeroWhatsApp,
                message: mensaje,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp:', error);
            
            // Guardar como error
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: error.message
            });
            
            // En desarrollo, simular si falla el envío real
            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo');
                return this.simularEnvio(cliente, documento, codigo, 'documento_listo');
            }
            
            throw error;
        }
    }

    /**
     * Enviar mensaje de documento entregado
     */
    async enviarDocumentoEntregado(documento, datosEntrega) {
        const cliente = {
            clientName: documento.clientName,
            clientPhone: documento.clientPhone
        };
        const mensaje = await this.generarMensajeDocumentoEntregadoFromTemplate(cliente, documento, datosEntrega);

        // 🔄 CONSERVADOR: Preparar datos para guardar en BD como enviarDocumentoListo
        const notificationData = {
            documentId: documento.id || null,
            clientName: clientName,
            clientPhone: clientPhone,
            messageType: 'DOCUMENT_DELIVERED',
            messageBody: mensaje
        };

        if (!this.isEnabled || !this.client) {
            // Modo simulación
            const simulationResult = this.simularEnvio(documento, datosEntrega, 'documento_entregado');
            
            // 💾 Guardar como simulada
            await this.saveNotification({
                ...notificationData,
                status: 'SIMULATED',
                messageId: simulationResult.messageId
            });
            
            return simulationResult;
        }

        const numeroWhatsApp = this.formatPhoneNumber(clientPhone);
        if (!numeroWhatsApp) {
            // 💾 Guardar como error
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: `Número de teléfono inválido: ${clientPhone}`
            });
            throw new Error(`Número de teléfono inválido: ${clientPhone}`);
        }

        try {
            const result = await this.client.messages.create({
                from: this.fromNumber,
                to: numeroWhatsApp,
                body: mensaje
            });

            console.log(`📱 WhatsApp de entrega enviado: ${result.sid} → ${numeroWhatsApp}`);
            
            // 💾 Guardar como exitosa
            await this.saveNotification({
                ...notificationData,
                status: 'SENT',
                messageId: result.sid
            });

            return {
                success: true,
                messageId: result.sid,
                to: numeroWhatsApp,
                message: mensaje,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp de entrega:', error);
            
            // 💾 Guardar como error
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: error.message
            });
            
            // En desarrollo, simular si falla el envío real
            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo');
                return this.simularEnvio(documento, datosEntrega, 'documento_entregado');
            }
            
            throw error;
        }
    }

    /**
     * Enviar notificación de documento listo (nueva función para integración)
     * Compatible con el formato de datos del controlador
     */
    async sendDocumentReadyNotification(document) {
        try {
            // Preparar datos del cliente en el formato esperado
            const cliente = {
                nombre: document.clientName,
                clientName: document.clientName,
                telefono: document.clientPhone,
                clientPhone: document.clientPhone
            };

            // Preparar datos del documento (incluir ID para poder guardarlo en notificaciones)
            const documento = {
                id: document.id,
                tipo_documento: document.documentType,
                tipoDocumento: document.documentType,
                numero_documento: document.protocolNumber,
                protocolNumber: document.protocolNumber
            };

            // Usar el código de verificación existente o generar uno temporal
            const codigo = document.verificationCode || 'TEMP';

            // Llamar a la función existente
            return await this.enviarDocumentoListo(cliente, documento, codigo);

        } catch (error) {
            console.error('❌ Error en sendDocumentReadyNotification:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Enviar notificación de grupo de documentos listos
     */
    async enviarGrupoDocumentosListo(cliente, documentos, codigo) {
        if (!this.isEnabled || !this.client) {
            return this.simularEnvio(cliente, documentos, codigo, 'grupo_listo');
        }

        const numeroWhatsApp = this.formatPhoneNumber(cliente.telefono || cliente.clientPhone);
        if (!numeroWhatsApp) {
            throw new Error(`Número de teléfono inválido: ${cliente.telefono || cliente.clientPhone}`);
        }

        const mensaje = this.generarMensajeGrupoListo(cliente, documentos, codigo);

        try {
            const result = await this.client.messages.create({
                from: this.fromNumber,
                to: numeroWhatsApp,
                body: mensaje
            });

            console.log(`📱 WhatsApp grupo enviado: ${result.sid} → ${numeroWhatsApp}`);
            return {
                success: true,
                messageId: result.sid,
                to: numeroWhatsApp,
                message: mensaje,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp de grupo:', error);
            
            if (this.isDevelopment) {
                return this.simularEnvio(cliente, documentos, codigo, 'grupo_listo');
            }
            
            throw error;
        }
    }

    /**
     * Reemplazar variables en template de mensaje
     */
    replaceTemplateVariables(templateMessage, variables) {
        let mensaje = templateMessage;
        
        // Variables disponibles
        const availableVariables = {
            cliente: variables.cliente || 'Cliente',
            documento: variables.documento || 'Documento',
            codigo: variables.codigo || 'XXXX',
            notaria: this.notariaConfig.nombre,
            fecha: variables.fecha || new Date().toLocaleDateString('es-EC', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }),
            receptor_nombre: variables.receptor_nombre || '',
            receptor_cedula: variables.receptor_cedula || '',
            receptor_relacion: variables.receptor_relacion || '',
        };

        // Reemplazar cada variable
        Object.keys(availableVariables).forEach(variable => {
            const regex = new RegExp(`\\{${variable}\\}`, 'g');
            mensaje = mensaje.replace(regex, availableVariables[variable]);
        });

        return mensaje;
    }

    /**
     * Generar mensaje para documento individual listo usando template de BD
     */
    async generarMensajeDocumentoListoFromTemplate(cliente, documento, codigo) {
        try {
            const template = await getActiveTemplateByType('DOCUMENTO_LISTO');
            
            const variables = {
                cliente: cliente.nombre || cliente.clientName || 'Cliente',
                documento: documento.tipo_documento || documento.tipoDocumento || 'Documento',
                codigo: codigo
            };

            return this.replaceTemplateVariables(template.mensaje, variables);
        } catch (error) {
            console.error('Error usando template de BD, usando fallback:', error);
            // Fallback al método original
            return this.generarMensajeDocumentoListo(cliente, documento, codigo);
        }
    }

    /**
     * Generar mensaje para documento entregado usando template de BD
     */
    async generarMensajeDocumentoEntregadoFromTemplate(cliente, documento, datosEntrega) {
        try {
            const template = await getActiveTemplateByType('DOCUMENTO_ENTREGADO');
            
            const variables = {
                cliente: cliente.nombre || cliente.clientName || 'Cliente',
                documento: documento.tipo_documento || documento.tipoDocumento || 'Documento',
                codigo: datosEntrega.codigo || '',
                fecha: new Date().toLocaleDateString('es-EC', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                receptor_nombre: datosEntrega.entregadoA || '',
                receptor_cedula: datosEntrega.cedulaReceptor || '',
                receptor_relacion: datosEntrega.relacionTitular || '',
            };

            return this.replaceTemplateVariables(template.mensaje, variables);
        } catch (error) {
            console.error('Error usando template de BD, usando fallback:', error);
            // Fallback al método original
            return this.generarMensajeDocumentoEntregado(cliente, documento, datosEntrega);
        }
    }

    /**
     * Generar mensaje para documento individual listo
     */
    generarMensajeDocumentoListo(cliente, documento, codigo) {
        const nombreCliente = cliente.nombre || cliente.clientName || 'Cliente';
        const tipoDoc = documento.tipo_documento || documento.tipoDocumento || 'Documento';
        const numeroDoc = documento.numero_documento || documento.protocolNumber || '';

        return `🏛️ *${this.notariaConfig.nombre}*

Estimado/a ${nombreCliente},

Su documento está listo para retiro:
📄 *Documento:* ${tipoDoc}${numeroDoc ? `\n📋 *Número:* ${numeroDoc}` : ''}
🔢 *Código de retiro:* ${codigo}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* ${this.notariaConfig.direccion}
⏰ *Horario:* ${this.notariaConfig.horario}

¡Gracias por confiar en nosotros!`;
    }

    /**
     * Generar mensaje para documento entregado
     */
    generarMensajeDocumentoEntregado(cliente, documento, datosEntrega) {
        const nombreCliente = cliente.nombre || cliente.clientName || 'Cliente';
        const tipoDoc = documento.tipo_documento || documento.tipoDocumento || 'Documento';
        const numeroDoc = documento.numero_documento || documento.protocolNumber || '';
        const entregadoA = datosEntrega.entregado_a || datosEntrega.deliveredTo || 'Cliente';
        const fecha = new Date().toLocaleDateString('es-EC', {
            day: '2-digit',
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `🏛️ *${this.notariaConfig.nombre}*

Estimado/a ${nombreCliente},

✅ Confirmamos la entrega de su documento:
📄 *Documento:* ${tipoDoc}${numeroDoc ? `\n📋 *Número:* ${numeroDoc}` : ''}
👤 *Retirado por:* ${entregadoA}
📅 *Fecha y hora:* ${fecha}

¡Gracias por confiar en nuestros servicios!`;
    }

    /**
     * Generar mensaje para grupo de documentos listos
     */
    generarMensajeGrupoListo(cliente, documentos, codigo) {
        const nombreCliente = cliente.nombre || cliente.clientName || 'Cliente';
        const cantidad = Array.isArray(documentos) ? documentos.length : documentos;
        
        let listaDocumentos = '';
        if (Array.isArray(documentos) && documentos.length <= 5) {
            listaDocumentos = '\n\n📄 *Documentos incluidos:*\n' + 
                documentos.map((doc, index) => 
                    `${index + 1}. ${doc.tipo_documento || doc.tipoDocumento || 'Documento'}`
                ).join('\n');
        }

        return `🏛️ *${this.notariaConfig.nombre}*

Estimado/a ${nombreCliente},

Sus documentos están listos para retiro:
📦 *Cantidad:* ${cantidad} documento(s)
🔢 *Código de retiro:* ${codigo}${listaDocumentos}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* ${this.notariaConfig.direccion}
⏰ *Horario:* ${this.notariaConfig.horario}

¡Gracias por confiar en nosotros!`;
    }

    /**
     * Simular envío para desarrollo/testing
     */
    simularEnvio(documento, datos, tipo) {
        const numeroSimulado = this.formatPhoneNumber(documento.clientPhone) || 
                              `whatsapp:+593987654321`;
        
        let mensaje;
        let cliente = { clientName: documento.clientName };
        switch (tipo) {
            case 'documento_listo':
                mensaje = this.generarMensajeDocumentoListo(cliente, documento, datos);
                break;
            case 'documento_entregado':
                mensaje = this.generarMensajeDocumentoEntregado(cliente, documento, datos);
                break;
            case 'grupo_listo':
                mensaje = this.generarMensajeGrupoListo(cliente, documento, datos);
                break;
            default:
                mensaje = 'Mensaje de prueba';
        }

        const simulacion = {
            success: true,
            messageId: `sim_${Date.now()}`,
            to: numeroSimulado,
            message: mensaje,
            simulated: true,
            timestamp: new Date().toISOString()
        };

        console.log('\n📱 ═══════════ SIMULACIÓN WHATSAPP ═══════════');
        console.log(`Para: ${simulacion.to}`);
        console.log(`Tipo: ${tipo}`);
        console.log('─'.repeat(50));
        console.log(simulacion.message);
        console.log('═'.repeat(50));

        return simulacion;
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