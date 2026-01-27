/**
 * Servicio para manejar notificaciones nativas del navegador (Push Notifications)
 * Incluye soporte para sonido de notificación
 */

// Mapeo de tipos de mensaje a etiquetas legibles
const TIPO_LABELS = {
    'SOLICITUD_ACTUALIZACION': 'Solicitud de actualización',
    'PRIORIZAR': 'Priorizar trámite',
    'CLIENTE_ESPERANDO': 'Cliente preguntando',
    'COBRO': 'Recordatorio de cobro',
    'OTRO': 'Mensaje'
};

// Mapeo de urgencias a emojis
const URGENCIA_EMOJI = {
    'NORMAL': '',
    'URGENTE': '⚠️ ',
    'CRITICO': '🔴 '
};

const browserNotificationService = {
    /**
     * Solicitar permiso para mostrar notificaciones
     * @returns {Promise<boolean>} - True si se concedió el permiso
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('Este navegador no soporta notificaciones de escritorio');
            return false;
        }

        if (Notification.permission === 'granted') {
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }

        return false;
    },

    /**
     * Reproducir sonido de notificación
     */
    playNotificationSound() {
        try {
            // Crear un sonido simple usando Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configurar tono agradable
            oscillator.frequency.value = 880; // Nota A5
            oscillator.type = 'sine';

            // Volumen bajo para no molestar
            gainNode.gain.value = 0.1;

            // Reproducir por 150ms
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                audioContext.close();
            }, 150);
        } catch (error) {
            // Silencioso si falla el audio
            console.debug('No se pudo reproducir sonido de notificación:', error);
        }
    },

    /**
     * Mostrar una notificación
     * @param {string} title - Título de la notificación
     * @param {Object} options - Opciones de la notificación (body, icon, tag, etc.)
     */
    async show(title, options = {}) {
        if (Notification.permission !== 'granted') {
            const granted = await this.requestPermission();
            if (!granted) return null;
        }

        const defaultOptions = {
            icon: '/logo-notaria18.jpg',
            badge: '/logo-notaria18.jpg',
            silent: false,
            timestamp: Date.now(),
            requireInteraction: false, // No requerir interacción para cerrar
            ...options
        };

        try {
            const notification = new Notification(title, defaultOptions);

            // Reproducir sonido
            if (!options.silent) {
                this.playNotificationSound();
            }

            notification.onclick = function (event) {
                event.preventDefault();
                window.focus();
                notification.close();
            };

            // Auto-cerrar después de 8 segundos
            setTimeout(() => {
                notification.close();
            }, 8000);

            return notification;
        } catch (error) {
            console.error('Error al mostrar notificación:', error);
            return null;
        }
    },

    /**
     * Mostrar notificación de nuevo mensaje interno
     * @param {Object} mensaje - Objeto del mensaje
     */
    async notifyNewMessage(mensaje) {
        // El backend devuelve 'remitente' con firstName/lastName
        const sender = mensaje.remitente
            ? `${mensaje.remitente.firstName || ''} ${mensaje.remitente.lastName || ''}`.trim()
            : 'Administrador';

        // Obtener emoji de urgencia
        const urgenciaEmoji = URGENCIA_EMOJI[mensaje.urgencia] || '';

        // Obtener tipo legible
        const tipoLabel = TIPO_LABELS[mensaje.tipo] || mensaje.tipo;

        // Construir cuerpo del mensaje
        let body = mensaje.mensaje || tipoLabel;

        // Si hay documento, incluir número de protocolo
        if (mensaje.documento?.protocolNumber) {
            body = `${mensaje.documento.protocolNumber}: ${body}`;
        }

        const title = `${urgenciaEmoji}Mensaje de ${sender}`;

        return this.show(title, {
            body: body,
            tag: `msg-${mensaje.id}`,
            data: { id: mensaje.id }
        });
    },

    /**
     * Verificar si las notificaciones están habilitadas
     * @returns {boolean}
     */
    isEnabled() {
        return 'Notification' in window && Notification.permission === 'granted';
    },

    /**
     * Obtener estado del permiso
     * @returns {string} 'granted' | 'denied' | 'default' | 'unsupported'
     */
    getPermissionStatus() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        return Notification.permission;
    }
};

export default browserNotificationService;
