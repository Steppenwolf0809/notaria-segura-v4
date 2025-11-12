import nodemailer from 'nodemailer';
import { log } from '../utils/logger.js';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Configuración del transporter
let transporter = null;

/**
 * Inicializa el transporter de Nodemailer
 */
function initializeTransporter() {
  if (transporter) {
    return transporter;
  }

  const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  };

  // En desarrollo, si no hay config de SMTP, usar ethereal
  if (isDevelopment && (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD)) {
    log.warn('No SMTP credentials found. Using development mode - emails will be logged only');
    transporter = {
      sendMail: async (mailOptions) => {
        log.info('📧 Development Email (NOT SENT):', {
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html?.substring(0, 200) + '...'
        });
        return { messageId: `dev-${Date.now()}` };
      }
    };
    return transporter;
  }

  try {
    transporter = nodemailer.createTransporter(emailConfig);
    log.info('Email transporter initialized', {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure
    });
  } catch (error) {
    log.error('Failed to initialize email transporter', error);
    throw error;
  }

  return transporter;
}

/**
 * Envía un email
 * @param {Object} options - Opciones del email
 * @param {string} options.to - Destinatario
 * @param {string} options.subject - Asunto
 * @param {string} options.html - Contenido HTML
 * @param {string} options.text - Contenido texto plano (opcional)
 * @returns {Promise<Object>} Información del envío
 */
export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = initializeTransporter();

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Notaría Segura'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '') // Fallback a texto plano
    };

    const info = await transport.sendMail(mailOptions);

    log.info('Email sent successfully', {
      messageId: info.messageId,
      to,
      subject
    });

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    log.error('Failed to send email', error, {
      to,
      subject
    });

    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Envía email de recuperación de contraseña
 * @param {string} email - Email del usuario
 * @param {string} resetToken - Token de recuperación
 * @param {string} firstName - Nombre del usuario
 * @returns {Promise<Object>}
 */
export async function sendPasswordResetEmail(email, resetToken, firstName) {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recuperación de Contraseña</h1>
        </div>
        <div class="content">
          <p>Hola ${firstName},</p>
          <p>Recibimos una solicitud para restablecer tu contraseña en Notaría Segura.</p>
          <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px;">
            ${resetUrl}
          </p>
          <div class="warning">
            ⚠️ <strong>Importante:</strong> Este enlace expirará en 1 hora por seguridad.
          </div>
          <p>Si no solicitaste este cambio, ignora este mensaje y tu contraseña permanecerá sin cambios.</p>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
          <p>&copy; ${new Date().getFullYear()} Notaría Segura. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Recuperación de Contraseña - Notaría Segura',
    html
  });
}

/**
 * Envía email de verificación de correo
 * @param {string} email - Email a verificar
 * @param {string} verificationToken - Token de verificación
 * @param {string} firstName - Nombre del usuario
 * @returns {Promise<Object>}
 */
export async function sendEmailVerification(email, verificationToken, firstName) {
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Verificación de Email</h1>
        </div>
        <div class="content">
          <p>Hola ${firstName},</p>
          <p>Gracias por registrarte en Notaría Segura. Para completar tu registro, por favor verifica tu dirección de correo electrónico.</p>
          <div style="text-align: center;">
            <a href="${verifyUrl}" class="button">Verificar Email</a>
          </div>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 5px;">
            ${verifyUrl}
          </p>
          <p>Este enlace expirará en 24 horas.</p>
        </div>
        <div class="footer">
          <p>Si no creaste esta cuenta, puedes ignorar este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} Notaría Segura. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Verifica tu Email - Notaría Segura',
    html
  });
}

/**
 * Envía email cuando se cambia la contraseña
 * @param {string} email - Email del usuario
 * @param {string} firstName - Nombre del usuario
 * @param {string} ipAddress - IP desde donde se cambió
 * @returns {Promise<Object>}
 */
export async function sendPasswordChangedEmail(email, firstName, ipAddress) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔒 Contraseña Cambiada</h1>
        </div>
        <div class="content">
          <p>Hola ${firstName},</p>
          <p>Te confirmamos que tu contraseña ha sido cambiada exitosamente.</p>
          <p><strong>Detalles del cambio:</strong></p>
          <ul>
            <li>Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'America/Guayaquil' })}</li>
            <li>Dirección IP: ${ipAddress || 'No disponible'}</li>
          </ul>
          <div class="warning">
            ⚠️ <strong>¿No fuiste tú?</strong> Si no realizaste este cambio, contacta inmediatamente con el administrador.
          </div>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Notaría Segura. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Tu contraseña ha sido cambiada - Notaría Segura',
    html
  });
}

/**
 * Envía alerta de seguridad
 * @param {string} email - Email del usuario
 * @param {string} firstName - Nombre del usuario
 * @param {Object} alertData - Datos de la alerta
 * @returns {Promise<Object>}
 */
export async function sendSecurityAlert(email, firstName, alertData) {
  const { alertType, message, ipAddress, timestamp } = alertData;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .alert { background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Alerta de Seguridad</h1>
        </div>
        <div class="content">
          <p>Hola ${firstName},</p>
          <p>Se ha detectado actividad sospechosa en tu cuenta:</p>
          <div class="alert">
            <strong>${alertType}:</strong> ${message}
          </div>
          <p><strong>Detalles:</strong></p>
          <ul>
            <li>Fecha: ${timestamp || new Date().toLocaleString('es-ES')}</li>
            <li>Dirección IP: ${ipAddress || 'No disponible'}</li>
          </ul>
          <p>Si reconoces esta actividad, puedes ignorar este mensaje. De lo contrario, te recomendamos cambiar tu contraseña inmediatamente.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Notaría Segura. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `⚠️ Alerta de Seguridad - ${alertType}`,
    html
  });
}

export default {
  sendEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendPasswordChangedEmail,
  sendSecurityAlert
};
