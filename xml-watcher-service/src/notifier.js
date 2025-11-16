import nodemailer from 'nodemailer';
import path from 'path';

export class Notifier {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
    this.enabled = config.notifications?.email?.enabled || false;
    this.transporter = null;

    if (this.enabled) {
      this._initializeTransporter();
    }
  }

  _initializeTransporter() {
    const emailConfig = this.config.notifications.email;

    try {
      this.transporter = nodemailer.createTransport({
        host: emailConfig.smtp.host,
        port: emailConfig.smtp.port,
        secure: emailConfig.smtp.secure || false,
        auth: {
          user: emailConfig.smtp.user,
          pass: emailConfig.smtp.password
        }
      });

      this.logger.info('Sistema de notificaciones por email inicializado');
    } catch (err) {
      this.logger.error(`Error inicializando notificaciones: ${err.message}`);
      this.enabled = false;
    }
  }

  /**
   * Envía notificación de error
   */
  async notifyError(error, context = {}) {
    if (!this.enabled) return;

    const emailConfig = this.config.notifications.email;
    const subject = `⚠️ Error en XML Watcher Service - ${context.type || 'General'}`;

    const html = `
      <h2>Error en Servicio de Monitoreo XML</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</p>
      <p><strong>Tipo:</strong> ${context.type || 'Error general'}</p>

      <h3>Detalles del Error:</h3>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px;">${error.message || error}</pre>

      ${context.file ? `<p><strong>Archivo:</strong> ${path.basename(context.file)}</p>` : ''}
      ${context.files ? `<p><strong>Archivos afectados:</strong> ${context.files.length}</p>` : ''}

      ${context.stack ? `
        <h3>Stack Trace:</h3>
        <pre style="background: #fff0f0; padding: 10px; border-radius: 5px; font-size: 12px;">${context.stack}</pre>
      ` : ''}

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del servicio de monitoreo XML de la Notaría.
      </p>
    `;

    try {
      await this.transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.recipients.join(', '),
        subject,
        html
      });

      this.logger.info(`Notificación de error enviada a: ${emailConfig.recipients.join(', ')}`);
    } catch (err) {
      this.logger.error(`Error enviando notificación: ${err.message}`);
    }
  }

  /**
   * Envía notificación de éxito diario
   */
  async notifyDailySummary(stats) {
    if (!this.enabled) return;

    const emailConfig = this.config.notifications.email;
    const subject = `📊 Resumen Diario - XML Watcher Service`;

    const successRate = stats.total > 0
      ? ((stats.successful / stats.total) * 100).toFixed(1)
      : 0;

    const html = `
      <h2>Resumen Diario del Servicio de Monitoreo XML</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-EC')}</p>

      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <tr style="background: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Total Archivos Procesados</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;">${stats.total}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Exitosos</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; color: green;">${stats.successful}</td>
        </tr>
        <tr style="background: #f0f0f0;">
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Errores</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd; color: red;">${stats.errors}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>Tasa de Éxito</strong></td>
          <td style="padding: 10px; border: 1px solid #ddd;"><strong>${successRate}%</strong></td>
        </tr>
      </table>

      ${stats.errorList && stats.errorList.length > 0 ? `
        <h3>Errores Detectados:</h3>
        <ul>
          ${stats.errorList.map(e => `<li>${e.file}: ${e.error}</li>`).join('')}
        </ul>
      ` : ''}

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del servicio de monitoreo XML de la Notaría.
      </p>
    `;

    try {
      await this.transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.recipients.join(', '),
        subject,
        html
      });

      this.logger.info(`Resumen diario enviado a: ${emailConfig.recipients.join(', ')}`);
    } catch (err) {
      this.logger.error(`Error enviando resumen diario: ${err.message}`);
    }
  }

  /**
   * Envía notificación de servicio iniciado
   */
  async notifyServiceStarted() {
    if (!this.enabled) return;

    const emailConfig = this.config.notifications.email;
    const subject = `✅ XML Watcher Service Iniciado`;

    const html = `
      <h2>Servicio de Monitoreo XML Iniciado</h2>
      <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</p>
      <p><strong>Carpeta Monitoreada:</strong> ${this.config.folders.watch}</p>
      <p><strong>API:</strong> ${this.config.apiUrl}</p>

      <p>El servicio está activo y monitoreando archivos XML.</p>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del servicio de monitoreo XML de la Notaría.
      </p>
    `;

    try {
      await this.transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.recipients.join(', '),
        subject,
        html
      });

      this.logger.info('Notificación de inicio enviada');
    } catch (err) {
      this.logger.error(`Error enviando notificación de inicio: ${err.message}`);
    }
  }

  /**
   * Envía notificación crítica (ej: muchos errores consecutivos)
   */
  async notifyCritical(message, details = {}) {
    if (!this.enabled) return;

    const emailConfig = this.config.notifications.email;
    const subject = `🚨 ALERTA CRÍTICA - XML Watcher Service`;

    const html = `
      <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 15px;">
        <h2 style="color: #f44336;">⚠️ ALERTA CRÍTICA</h2>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-EC')}</p>
        <p><strong>Mensaje:</strong> ${message}</p>

        ${Object.keys(details).length > 0 ? `
          <h3>Detalles:</h3>
          <ul>
            ${Object.entries(details).map(([key, value]) =>
              `<li><strong>${key}:</strong> ${value}</li>`
            ).join('')}
          </ul>
        ` : ''}
      </div>

      <p style="margin-top: 20px;">
        <strong>Acción requerida:</strong> Por favor revise el servicio inmediatamente.
      </p>

      <hr>
      <p style="color: #666; font-size: 12px;">
        Este es un mensaje automático del servicio de monitoreo XML de la Notaría.
      </p>
    `;

    try {
      await this.transporter.sendMail({
        from: emailConfig.from,
        to: emailConfig.recipients.join(', '),
        subject,
        html,
        priority: 'high'
      });

      this.logger.warn(`Alerta crítica enviada a: ${emailConfig.recipients.join(', ')}`);
    } catch (err) {
      this.logger.error(`Error enviando alerta crítica: ${err.message}`);
    }
  }
}
