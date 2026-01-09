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
     * Enviar mensaje de documento listo para retiro
     */
    async enviarDocumentoListo(cliente, documento, codigo) {
        const clientName = cliente.clientName || cliente.nombre;
        const clientPhone = cliente.clientPhone || cliente.telefono;
        // Usar template de BD o fallback a hardcodeado
        const mensaje = await this.generarMensajeDocumentoListoFromTemplate(cliente, documento, codigo);

        // Preparar notificación PENDING para trazar sin bloquear
        const notificationData = {
            documentId: documento.id || null,
            clientName: clientName,
            clientPhone: clientPhone,
            messageType: 'DOCUMENT_READY',
            messageBody: mensaje,
            status: 'PENDING'
        };
        const pending = await this.saveNotification(notificationData);

        if (!this.isEnabled || !this.client) {
            const simulationResult = this.simularEnvio(cliente, documento, codigo, 'documento_listo');
            if (pending?.id) await this.updateNotification(pending.id, { status: 'SIMULATED', messageId: simulationResult.messageId, sentAt: new Date() });
            return simulationResult;
        }

        const numeroWhatsApp = this.formatPhoneNumber(clientPhone);
        if (!numeroWhatsApp) {
            if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: `Número de teléfono inválido: ${clientPhone}` });
            throw new Error(`Número de teléfono inválido: ${clientPhone}`);
        }

        // Envío asíncrono para no bloquear la respuesta
        if (this.asyncMode) {
            setImmediate(async () => {
                try {
                    await this._sendAndUpdate({ pendingId: pending?.id, numeroWhatsApp, mensaje });
                } catch (e) {
                    if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: e.message });
                }
            });
            return { success: true, queued: true, to: numeroWhatsApp, message: mensaje };
        }

        try {
            return await this._sendAndUpdate({ pendingId: pending?.id, numeroWhatsApp, mensaje });
        } catch (error) {
            console.error('❌ Error enviando WhatsApp:', error);

            // En desarrollo, hacer fallback a simulación en lugar de fallar
            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo debido a:', error.message);

                // Crear resultado de simulación
                const simulationResult = this.simularEnvio(cliente, documento, codigo, 'documento_listo');

                if (pending?.id) await this.updateNotification(pending.id, { status: 'SIMULATED', messageId: simulationResult.messageId, errorMessage: `Fallback a simulación por error: ${error.message}`, sentAt: new Date() });

                return simulationResult;
            }

            if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: error.message });

            throw error;
        }
    }

    /**
     * Enviar mensaje de documento entregado
     */
    async enviarDocumentoEntregado(cliente, documento, datosEntrega) {
        const clientName = cliente.clientName || cliente.nombre;
        const clientPhone = cliente.clientPhone || cliente.telefono;
        const mensaje = await this.generarMensajeDocumentoEntregadoFromTemplate(cliente, documento, datosEntrega);

        const notificationData = {
            documentId: documento.id || null,
            clientName: clientName,
            clientPhone: clientPhone,
            messageType: 'DOCUMENT_DELIVERED',
            messageBody: mensaje,
            status: 'PENDING'
        };
        const pending = await this.saveNotification(notificationData);

        if (!this.isEnabled || !this.client) {
            const simulationResult = this.simularEnvio(cliente, documento, datosEntrega, 'documento_entregado');
            if (pending?.id) await this.updateNotification(pending.id, { status: 'SIMULATED', messageId: simulationResult.messageId, sentAt: new Date() });
            return simulationResult;
        }

        const numeroWhatsApp = this.formatPhoneNumber(clientPhone);
        if (!numeroWhatsApp) {
            if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: `Número de teléfono inválido: ${clientPhone}` });
            throw new Error(`Número de teléfono inválido: ${clientPhone}`);
        }

        if (this.asyncMode) {
            setImmediate(async () => {
                try {
                    await this._sendAndUpdate({ pendingId: pending?.id, numeroWhatsApp, mensaje });
                } catch (e) {
                    if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: e.message });
                }
            });
            return { success: true, queued: true, to: numeroWhatsApp, message: mensaje };
        }

        try {
            return await this._sendAndUpdate({ pendingId: pending?.id, numeroWhatsApp, mensaje });
        } catch (error) {
            console.error('❌ Error enviando WhatsApp de entrega:', error);

            // En desarrollo, hacer fallback a simulación en lugar de fallar
            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo debido a:', error.message);

                // Crear resultado de simulación
                const simulationResult = this.simularEnvio(cliente, documento, datosEntrega, 'documento_entregado');

                if (pending?.id) await this.updateNotification(pending.id, { status: 'SIMULATED', messageId: simulationResult.messageId, errorMessage: `Fallback a simulación por error: ${error.message}`, sentAt: new Date() });

                return simulationResult;
            }

            if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: error.message });

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
                protocolNumber: document.protocolNumber,
                actoPrincipalDescripcion: document.actoPrincipalDescripcion,
                actoPrincipalValor: document.actoPrincipalValor
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
        const clientName = cliente.clientName || cliente.nombre;
        const clientPhone = cliente.clientPhone || cliente.telefono;

        const mensaje = await this.generarMensajeGrupoListo(cliente, documentos, codigo);

        // Preparar datos para guardar en BD (igual que documentos individuales)
        const notificationData = {
            groupId: documentos[0]?.documentGroupId || null,
            clientName: clientName,
            clientPhone: clientPhone,
            messageType: 'GROUP_READY',
            messageBody: mensaje,
            documentCount: Array.isArray(documentos) ? documentos.length : documentos
        };

        if (!this.isEnabled || !this.client) {
            // Modo simulación - crear resultado simulado
            const simulationResult = {
                success: true,
                messageId: `sim_group_${Date.now()}`,
                to: this.formatPhoneNumber(clientPhone) || `whatsapp:+593987654321`,
                message: mensaje,
                simulated: true,
                timestamp: new Date().toISOString()
            };

            console.log('\n📱 ═══════════ SIMULACIÓN WHATSAPP GRUPO ═══════════');
            console.log(`Para: ${simulationResult.to}`);
            console.log(`Mensaje: ${mensaje}`);
            console.log('════════════════════════════════════════════════\n');

            // Guardar como simulada en BD
            await this.saveNotification({
                ...notificationData,
                status: 'SIMULATED',
                messageId: simulationResult.messageId
            });

            return simulationResult;
        }

        const numeroWhatsApp = this.formatPhoneNumber(clientPhone);
        if (!numeroWhatsApp) {
            // Guardar como error en BD
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: `Número de teléfono inválido: ${clientPhone}`
            });
            throw new Error(`Número de teléfono inválido: ${clientPhone}`);
        }

        // Envío asíncrono opcional para grupos también
        if (this.asyncMode) {
            const pending = await this.saveNotification({ ...notificationData, status: 'PENDING' });
            setImmediate(async () => {
                try {
                    const result = await this.client.messages.create({ from: this.fromNumber, to: numeroWhatsApp, body: mensaje });
                    if (pending?.id) await this.updateNotification(pending.id, { status: 'SENT', messageId: result.sid, sentAt: new Date() });
                } catch (e) {
                    if (pending?.id) await this.updateNotification(pending.id, { status: 'FAILED', errorMessage: e.message });
                }
            });
            return { success: true, queued: true, to: numeroWhatsApp, message: mensaje };
        }

        try {
            const result = await this.client.messages.create({ from: this.fromNumber, to: numeroWhatsApp, body: mensaje });
            await this.saveNotification({ ...notificationData, status: 'SENT', messageId: result.sid, sentAt: new Date() });
            return { success: true, messageId: result.sid, to: numeroWhatsApp, message: mensaje, timestamp: new Date().toISOString() };
        } catch (error) {
            console.error('❌ Error enviando WhatsApp de grupo:', error);

            if (this.isDevelopment) {
                console.log('🔄 Fallback a simulación en desarrollo debido a:', error.message);

                // En desarrollo, simular después del error
                const simulationResult = {
                    success: true,
                    messageId: `sim_group_fallback_${Date.now()}`,
                    to: numeroWhatsApp,
                    message: mensaje,
                    simulated: true,
                    timestamp: new Date().toISOString()
                };

                // Guardar SOLO como simulada (no como fallida)
                await this.saveNotification({
                    ...notificationData,
                    status: 'SIMULATED',
                    messageId: simulationResult.messageId,
                    errorMessage: `Fallback a simulación por error: ${error.message}`
                });

                return simulationResult;
            }

            // En producción, guardar como error y fallar
            await this.saveNotification({
                ...notificationData,
                status: 'FAILED',
                errorMessage: error.message
            });

            throw error;
        }
    }

    /**
     * Formatear fecha de manera legible en español
     */
    formatearFechaLegible(fecha = new Date()) {
        return formatLongDateTime(fecha);
    }

    /**
     * Generar lista de códigos de escritura
     */
    generarCodigosEscritura(documentos) {
        if (!Array.isArray(documentos) || documentos.length === 0) {
            return '';
        }

        // Si es un solo documento, mostrar código individual
        if (documentos.length === 1) {
            const codigo = this.extraerCodigoEscritura(documentos[0]);
            return codigo ? `📋 *Código de escritura:* ${codigo}` : '';
        }

        // Múltiples documentos - mostrar lista
        const codigos = documentos.map(doc => this.extraerCodigoEscritura(doc)).filter(Boolean);
        if (codigos.length === 0) return '';

        return '📋 *Códigos de escritura:*\n' + codigos.map((codigo, index) => `${index + 1}. ${codigo}`).join('\n');
    }

    /**
     * Extraer código de escritura de un documento
     */
    extraerCodigoEscritura(documento) {
        // Intentar obtener código de diferentes campos
        return documento.codigoEscritura ||
            documento.protocolNumber ||
            documento.numero_documento ||
            documento.numeroProtocolo ||
            null;
    }

    /**
     * Generar detalles de documentos para entrega
     */
    generarDocumentosDetalle(documentos, esGrupo = false) {
        if (!Array.isArray(documentos)) {
            // Documento individual
            const tipoDoc = documentos.documentType || documentos.tipo_documento || documentos.tipoDocumento || 'Documento';
            const codigoEscritura = this.extraerCodigoEscritura(documentos);
            const codigoRetiro = documentos.codigoRetiro || documentos.codigo_retiro || documentos.verificationCode || documentos.codigo;
            const partes = [
                `📄 *${tipoDoc}*`,
                codigoEscritura ? `📋 *Código:* ${codigoEscritura}` : null,
                codigoRetiro ? `🔢 *Código de retiro:* ${codigoRetiro}` : null
            ].filter(Boolean);
            return partes.join('\n');
        }

        if (documentos.length === 1) {
            return this.generarDocumentosDetalle(documentos[0], false);
        }

        // Múltiples documentos
        return documentos.map((doc, index) => {
            const tipoDoc = doc.documentType || doc.tipo_documento || doc.tipoDocumento || 'Documento';
            const codigoEscritura = this.extraerCodigoEscritura(doc);
            const codigoRetiro = doc.codigoRetiro || doc.codigo_retiro || doc.verificationCode;
            const partes = [
                `${index + 1}. 📄 *${tipoDoc}*`,
                codigoEscritura ? `Código: ${codigoEscritura}` : null,
                `Código de retiro: ${codigoRetiro || 'N/A'}`
            ].filter(Boolean);
            return partes.join(' • ');
        }).join('\n');
    }

    /**
     * Reemplazar variables en template de mensaje (versión mejorada)
     */
    replaceTemplateVariables(templateMessage, variables) {
        let mensaje = templateMessage;

        // Determinar si es entrega individual o múltiple
        const esEntregaMultiple = variables.cantidadDocumentos > 1 || (variables.documentos && Array.isArray(variables.documentos) && variables.documentos.length > 1);
        const tipoEntrega = esEntregaMultiple ? 'sus documentos' : 'su documento';

        // Detectar acto principal desde diferentes fuentes
        const firstDoc = Array.isArray(variables.documentos) && variables.documentos.length > 0
            ? variables.documentos[0]
            : variables;
        const actoPrincipalDetectado = variables.actoPrincipal
            || variables.actoPrincipalDescripcion
            || firstDoc?.actoPrincipalDescripcion
            || '';
        const actoPrincipalValorDetectado = variables.actoPrincipalValor
            || firstDoc?.actoPrincipalValor
            || '';

        // Generar sección de cédula condicional
        const seccionCedula = (variables.receptor_cedula || variables.cedulaReceptor) ?
            `🆔 *Cédula:* ${variables.receptor_cedula || variables.cedulaReceptor}` : '';

        // Variables disponibles (expandidas)
        const availableVariables = {
            // Variables básicas (compatibilidad)
            cliente: variables.cliente || variables.nombreCompareciente || 'Cliente',
            documento: variables.documento || 'Documento',
            codigo: variables.codigo || 'XXXX',
            notaria: this.notariaConfig.nombre,
            fecha: variables.fecha || formatDateTime(new Date()),

            // Variables mejoradas
            nombreCompareciente: variables.nombreCompareciente || variables.cliente || 'Cliente',
            nombreNotariaCompleto: this.notariaConfig.nombre,
            fechaFormateada: this.formatearFechaLegible(variables.fechaEntrega || new Date()),
            horaEntrega: formatTimeOnly(variables.fechaEntrega || new Date()),
            contactoConsultas: process.env.NOTARIA_CONTACTO || 'Tel: (02) 2234-567',
            actoPrincipal: actoPrincipalDetectado,
            actoPrincipalValor: actoPrincipalValorDetectado,

            // Variables de códigos
            codigosEscritura: this.generarCodigosEscritura(variables.documentos || [variables]),
            cantidadDocumentos: variables.cantidadDocumentos || (variables.documentos ? variables.documentos.length : 1),
            listaDocumentosCompleta: variables.documentos ?
                variables.documentos.map((doc, i) => {
                    const tipo = doc.documentType || doc.tipo_documento || 'Documento';
                    const codEscritura = this.extraerCodigoEscritura(doc);
                    const codRetiro = doc.codigoRetiro || doc.codigo_retiro || doc.verificationCode;
                    const partes = [
                        `• ${tipo}`,
                        codEscritura ? `Código: ${codEscritura}` : null,
                        `Código de retiro: ${codRetiro || 'N/A'}`
                    ].filter(Boolean);
                    return partes.join(' - ');
                }).join('\n') :
                (() => {
                    const tipo = variables.documento || 'Documento';
                    const codEscritura = this.extraerCodigoEscritura(variables);
                    const codRetiro = variables.codigoRetiro || variables.codigo || '';
                    const partes = [
                        `• ${tipo}`,
                        codEscritura ? `Código: ${codEscritura}` : null,
                        codRetiro ? `Código de retiro: ${codRetiro}` : null
                    ].filter(Boolean);
                    return partes.join(' - ');
                })(),

            // Variables condicionales
            nombreRetirador: variables.receptor_nombre || variables.nombreRetirador || variables.entregado_a || variables.deliveredTo || variables.cliente || 'Cliente',
            cedulaRetirador: variables.receptor_cedula || variables.cedulaReceptor || '',
            seccionCedula: seccionCedula,
            tipoEntrega: tipoEntrega,

            // Variables de formato para entrega
            documentosDetalle: this.generarDocumentosDetalle(variables.documentos || variables, esEntregaMultiple),

            // Variables para templates de entrega (compatibilidad)
            receptor_nombre: variables.receptor_nombre || variables.nombreRetirador || variables.entregado_a || variables.deliveredTo || '',
            receptor_cedula: variables.receptor_cedula || variables.cedulaReceptor || '',
            receptor_relacion: variables.receptor_relacion || variables.relacionTitular || '',
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
                // Variables básicas
                cliente: cliente.nombre || cliente.clientName || 'Cliente',
                documento: documento.tipo_documento || documento.tipoDocumento || documento.documentType || 'Documento',
                codigo: codigo,

                // Variables mejoradas
                nombreCompareciente: cliente.nombre || cliente.clientName || 'Cliente',
                documentos: [documento], // Para generar códigos de escritura
                cantidadDocumentos: 1,
                // Acto principal
                actoPrincipal: documento.actoPrincipalDescripcion || '',
                actoPrincipalValor: documento.actoPrincipalValor || documento.totalFactura || ''
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

            const fechaEntrega = datosEntrega.fechaEntrega || datosEntrega.fecha || new Date();

            const variables = {
                // Variables básicas
                cliente: cliente.nombre || cliente.clientName || 'Cliente',
                documento: documento.tipo_documento || documento.tipoDocumento || documento.documentType || 'Documento',
                codigo: datosEntrega.codigo || '',
                fecha: formatDateTime(fechaEntrega),

                // Variables mejoradas
                nombreCompareciente: cliente.nombre || cliente.clientName || 'Cliente',
                fechaEntrega: fechaEntrega,
                documentos: (Array.isArray(datosEntrega.documentos) && datosEntrega.documentos.length > 0)
                    ? datosEntrega.documentos
                    : [documento],
                cantidadDocumentos: (Array.isArray(datosEntrega.documentos) && datosEntrega.documentos.length > 0)
                    ? datosEntrega.documentos.length
                    : 1,
                // Acto principal (individual o primer doc del grupo)
                actoPrincipal: documento.actoPrincipalDescripcion || (Array.isArray(datosEntrega.documentos) && datosEntrega.documentos[0]?.actoPrincipalDescripcion) || '',
                actoPrincipalValor: documento.actoPrincipalValor || (Array.isArray(datosEntrega.documentos) && datosEntrega.documentos[0]?.actoPrincipalValor) || '',

                // Variables de entrega
                receptor_nombre: datosEntrega.entregadoA || datosEntrega.entregado_a || datosEntrega.deliveredTo || '',
                receptor_cedula: datosEntrega.cedulaReceptor || datosEntrega.cedula_receptor || '',
                receptor_relacion: datosEntrega.relacionTitular || datosEntrega.relacion_titular || '',
                nombreRetirador: datosEntrega.entregadoA || datosEntrega.entregado_a || datosEntrega.deliveredTo || '',
                cedulaReceptor: datosEntrega.cedulaReceptor || datosEntrega.cedula_receptor || ''
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
        const fecha = formatDateTime(new Date());

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
    async generarMensajeGrupoListo(cliente, documentos, codigo) {
        try {
            // Intentar usar template de BD si está disponible
            const template = await getActiveTemplateByType('DOCUMENTO_LISTO');

            const variables = {
                // Variables básicas
                cliente: cliente.nombre || cliente.clientName || 'Cliente',
                codigo: codigo,

                // Variables mejoradas para grupo
                nombreCompareciente: cliente.nombre || cliente.clientName || 'Cliente',
                documentos: Array.isArray(documentos) ? documentos : [documentos],
                cantidadDocumentos: Array.isArray(documentos) ? documentos.length : 1
            };

            return this.replaceTemplateVariables(template.mensaje, variables);
        } catch (error) {
            console.error('Error usando template de BD para grupo, usando fallback:', error);
            return this.generarMensajeGrupoListoFallback(cliente, documentos, codigo);
        }
    }

    /**
     * Fallback para mensaje de grupo de documentos listos
     */
    generarMensajeGrupoListoFallback(cliente, documentos, codigo) {
        const nombreCliente = cliente.nombre || cliente.clientName || 'Cliente';
        const cantidad = Array.isArray(documentos) ? documentos.length : documentos;

        let listaDocumentos = '';
        if (Array.isArray(documentos) && documentos.length > 0) {
            // Mostrar hasta 5 documentos detallados (conservador)
            const maxListado = 5;
            const itemsDetallados = documentos.slice(0, maxListado).map((doc, index) => {
                const tipoDocumento = doc.documentType || doc.tipo_documento || doc.tipoDocumento || 'Documento';
                const numeroProtocolo = this.extraerCodigoEscritura(doc);
                const detalleEspecifico = doc.detalle_documento || '';

                const partes = [
                    `${index + 1}. ${tipoDocumento}`,
                    numeroProtocolo ? `Código: ${numeroProtocolo}` : null,
                    detalleEspecifico ? `Detalle: ${detalleEspecifico}` : null
                ].filter(Boolean);

                return partes.join(' • ');
            });

            listaDocumentos = '\n\n📄 *Documentos incluidos:*\n' + itemsDetallados.join('\n');

            if (documentos.length > maxListado) {
                const restantes = documentos.length - maxListado;
                listaDocumentos += `\n… y ${restantes} más`;
            }
        }

        // Generar códigos de escritura
        const codigosEscritura = this.generarCodigosEscritura(documentos);

        return `🏛️ *${this.notariaConfig.nombre}*

Estimado/a ${nombreCliente},

Sus documentos están listos para retiro:
📦 *Cantidad:* ${cantidad} documento(s)
🔢 *Código de retiro:* ${codigo}${codigosEscritura ? '\n' + codigosEscritura : ''}${listaDocumentos}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* ${this.notariaConfig.direccion}
⏰ *Horario:* ${this.notariaConfig.horario}

Para consultas: ${process.env.NOTARIA_CONTACTO || 'Tel: (02) 2234-567'}
¡Gracias por confiar en nosotros!`;
    }

    /**
     * Simular envío para desarrollo/testing
     */
    simularEnvio(cliente, documento, datos, tipo) {
        // En caso de firma vieja (3 args), reajustar
        if (arguments.length === 3 && typeof datos === 'string') {
            tipo = datos;
            datos = documento;
            documento = cliente;
            cliente = { clientName: documento.clientName, clientPhone: documento.clientPhone };
        }

        const numeroSimulado = this.formatPhoneNumber(cliente?.clientPhone || cliente?.telefono) ||
            `whatsapp:+593987654321`;

        let mensaje;
        const clientData = { clientName: cliente?.clientName || cliente?.nombre || 'Cliente' };
        switch (tipo) {
            case 'documento_listo':
                mensaje = this.generarMensajeDocumentoListo(clientData, documento, datos);
                break;
            case 'documento_entregado':
                mensaje = this.generarMensajeDocumentoEntregado(clientData, documento, datos);
                break;
            case 'grupo_listo':
                mensaje = this.generarMensajeGrupoListo(clientData, documento, datos);
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
