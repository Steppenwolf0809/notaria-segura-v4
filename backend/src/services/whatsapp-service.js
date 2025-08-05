import twilio from 'twilio';
import { parsePhoneNumber } from 'libphonenumber-js';

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
            nombre: process.env.NOTARIA_NOMBRE || "NOTARÍA PRIMERA DEL CANTÓN AMBATO",
            direccion: process.env.NOTARIA_DIRECCION || "Calle Sucre y Tomás Sevilla",
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
        if (!this.isEnabled || !this.client) {
            return this.simularEnvio(cliente, documento, codigo, 'documento_listo');
        }

        const numeroWhatsApp = this.formatPhoneNumber(cliente.telefono || cliente.clientPhone);
        if (!numeroWhatsApp) {
            throw new Error(`Número de teléfono inválido: ${cliente.telefono || cliente.clientPhone}`);
        }

        const mensaje = this.generarMensajeDocumentoListo(cliente, documento, codigo);

        try {
            const result = await this.client.messages.create({
                from: this.fromNumber,
                to: numeroWhatsApp,
                body: mensaje
            });

            console.log(`📱 WhatsApp enviado: ${result.sid} → ${numeroWhatsApp}`);
            return {
                success: true,
                messageId: result.sid,
                to: numeroWhatsApp,
                message: mensaje,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp:', error);
            
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
    async enviarDocumentoEntregado(cliente, documento, datosEntrega) {
        if (!this.isEnabled || !this.client) {
            return this.simularEnvio(cliente, documento, datosEntrega, 'documento_entregado');
        }

        const numeroWhatsApp = this.formatPhoneNumber(cliente.telefono || cliente.clientPhone);
        if (!numeroWhatsApp) {
            throw new Error(`Número de teléfono inválido: ${cliente.telefono || cliente.clientPhone}`);
        }

        const mensaje = this.generarMensajeDocumentoEntregado(cliente, documento, datosEntrega);

        try {
            const result = await this.client.messages.create({
                from: this.fromNumber,
                to: numeroWhatsApp,
                body: mensaje
            });

            console.log(`📱 WhatsApp de entrega enviado: ${result.sid} → ${numeroWhatsApp}`);
            return {
                success: true,
                messageId: result.sid,
                to: numeroWhatsApp,
                message: mensaje,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp de entrega:', error);
            
            // En desarrollo, simular si falla el envío real
            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo');
                return this.simularEnvio(cliente, documento, datosEntrega, 'documento_entregado');
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

            // Preparar datos del documento
            const documento = {
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
    simularEnvio(cliente, documento, datos, tipo) {
        const numeroSimulado = this.formatPhoneNumber(cliente.telefono || cliente.clientPhone) || 
                              `whatsapp:+593987654321`;
        
        let mensaje;
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