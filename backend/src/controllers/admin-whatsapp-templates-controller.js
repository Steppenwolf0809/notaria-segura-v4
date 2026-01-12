import prisma from '../db.js';

/**
 * Controller para administración de templates WhatsApp
 * Funcionalidad CRUD simple con principio KISS
 */

/**
 * Variables disponibles para templates
 */
const AVAILABLE_VARIABLES = {
  // Variables básicas existentes
  cliente: 'Nombre del cliente (alias: nombreCompareciente)',
  documento: 'Tipo de documento',
  codigo: 'Código de verificación 4 dígitos',
  notaria: 'Nombre de la notaría (alias: nombreNotariaCompleto)',
  fecha: 'Fecha actual formateada (alias: fechaFormateada)',

  // Variables mejoradas y nuevas
  nombreCompareciente: 'Nombre completo del compareciente/cliente',
  nombreNotariaCompleto: 'Nombre oficial completo de la notaría',
  fechaFormateada: 'Fecha legible (ej: "23 de agosto de 2025, 12:54 PM")',
  horaEntrega: 'Hora de entrega formateada',
  contactoConsultas: 'Teléfono/email para consultas',
  actoPrincipal: 'Descripción del acto principal del trámite',
  actoPrincipalValor: 'Valor del acto principal (monto)',

  // Variables para códigos de escritura
  codigosEscritura: 'Lista de códigos de escritura de documentos',
  cantidadDocumentos: 'Número total de documentos',
  listaDocumentosCompleta: 'Lista detallada con códigos específicos',

  // Variables condicionales
  nombreRetirador: 'Nombre de quien retira el documento',
  cedulaRetirador: 'Cédula de quien retira (solo si existe)',
  seccionCedula: 'Línea completa "🆔 Cédula: XXXX" o vacía si no hay cédula',
  tipoEntrega: 'Individual o múltiple (afecta formato)',

  // Variables de formato para entrega
  documentosDetalle: 'Lista formateada de documentos entregados',

  // Variables para templates de entrega
  receptor_nombre: 'Nombre de quien recibió el documento',
  receptor_cedula: 'Cédula del receptor (opcional)',
  receptor_relacion: 'Relación con el titular'
};

/**
 * Templates por defecto del sistema (fallback)
 */
const DEFAULT_TEMPLATES = {
  DOCUMENTO_LISTO: {
    titulo: 'Documento Listo para Retiro (Mejorado)',
    mensaje: `🏛️ *{nombreNotariaCompleto}*

Estimado/a {nombreCompareciente},

Su documento está listo para retiro:
📄 *Documento:* {documento}
📝 *Acto:* {actoPrincipal}
🔢 *Código de retiro:* {codigo}
{codigosEscritura}
📊 *Documentos:* {cantidadDocumentos}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: {contactoConsultas}
¡Gracias por confiar en nosotros!`
  },
  RECORDATORIO_RETIRO: {
    titulo: 'Recordatorio de Retiro de Documento',
    mensaje: `🏛️ *{nombreNotariaCompleto}*

Estimado/a {nombreCompareciente},

⏰ *RECORDATORIO:* Su(s) documento(s) está(n) listo(s) para retiro desde hace varios días.

📄 *Documento:* {documento}
📝 *Acto:* {actoPrincipal}
🔢 *Código de retiro:* {codigo}
{codigosEscritura}

⚠️ Le recordamos que puede retirar su documentación en nuestras oficinas.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: {contactoConsultas}
¡Esperamos su visita!`
  },
  DOCUMENTO_ENTREGADO: {
    titulo: 'Confirmación de Entrega (Mejorado)',
    mensaje: `🏛️ *{nombreNotariaCompleto}*

Estimado/a {nombreCompareciente},

✅ Confirmamos la entrega de {tipoEntrega}:
{documentosDetalle}
👤 *Retirado por:* {nombreRetirador}
{seccionCedula}
📅 *Fecha:* {fechaFormateada}

Para consultas: {contactoConsultas}
¡Gracias por confiar en nuestros servicios!`
  }
};

/**
 * Obtener todos los templates
 */
export const getTemplates = async (req, res) => {
  try {
    const templates = await prisma.whatsAppTemplate.findMany({
      orderBy: [
        { tipo: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: templates,
      availableVariables: AVAILABLE_VARIABLES
    });
  } catch (error) {
    console.error('Error obteniendo templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener template por ID
 */
export const getTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error obteniendo template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Crear nuevo template
 */
export const createTemplate = async (req, res) => {
  try {
    const { tipo, titulo, mensaje, activo = true } = req.body;

    // Validaciones simples
    if (!tipo || !titulo || !mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos: tipo, titulo, mensaje'
      });
    }

    if (!['DOCUMENTO_LISTO', 'DOCUMENTO_ENTREGADO', 'RECORDATORIO_RETIRO'].includes(tipo)) {
      return res.status(400).json({
        success: false,
        error: 'Tipo de template inválido'
      });
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        tipo,
        titulo,
        mensaje,
        activo
      }
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template creado exitosamente'
    });
  } catch (error) {
    console.error('Error creando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Actualizar template existente
 */
export const updateTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, mensaje, activo } = req.body;

    // Verificar que el template existe
    const existingTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: {
        ...(titulo !== undefined && { titulo }),
        ...(mensaje !== undefined && { mensaje }),
        ...(activo !== undefined && { activo })
      }
    });

    res.json({
      success: true,
      data: template,
      message: 'Template actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error actualizando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Eliminar template
 */
export const deleteTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el template existe
    const existingTemplate = await prisma.whatsAppTemplate.findUnique({
      where: { id }
    });

    if (!existingTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    await prisma.whatsAppTemplate.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Template eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error eliminando template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Activar/Desactivar template
 */
export const toggleTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'El campo activo debe ser boolean'
      });
    }

    const template = await prisma.whatsAppTemplate.update({
      where: { id },
      data: { activo }
    });

    res.json({
      success: true,
      data: template,
      message: `Template ${activo ? 'activado' : 'desactivado'} exitosamente`
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Template no encontrado'
      });
    }

    console.error('Error actualizando estado template:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Generar preview del mensaje con datos ejemplo
 */
export const previewTemplate = async (req, res) => {
  try {
    const { mensaje } = req.body;

    if (!mensaje) {
      return res.status(400).json({
        success: false,
        error: 'Campo mensaje requerido'
      });
    }

    // Datos ejemplo para preview (variables mejoradas)
    const datosEjemplo = {
      // Variables básicas (compatibilidad)
      cliente: 'María García',
      documento: 'Protocolo de Compraventa',
      codigo: '1234',
      notaria: 'NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO',
      fecha: new Date().toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),

      // Variables mejoradas
      nombreCompareciente: 'María García Pérez',
      nombreNotariaCompleto: 'NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO',
      fechaFormateada: '23 de agosto de 2025, 12:54 PM',
      horaEntrega: '12:54 PM',
      contactoConsultas: 'Tel: (02) 2234-567 | email@notaria18.gob.ec',
      actoPrincipal: 'Compraventa de inmueble',
      actoPrincipalValor: '150.00',

      // Variables de códigos
      codigosEscritura: '📋 *Código de escritura:* 20251701018D00919',
      cantidadDocumentos: '1',
      listaDocumentosCompleta: '• Protocolo de Compraventa - Código: 20251701018D00919',

      // Variables condicionales (ejemplo con cédula)
      nombreRetirador: 'María García Pérez',
      cedulaRetirador: '1234567890',
      seccionCedula: '🆔 *Cédula:* 1234567890',
      tipoEntrega: 'su documento',
      documentosDetalle: '📄 *Protocolo de Compraventa*\n📋 *Código:* 20251701018D00919',

      // Variables de entrega
      receptor_nombre: 'María García Pérez',
      receptor_cedula: '1234567890',
      receptor_relacion: 'Titular',

      // 🛡️ Variables de Emojis Seguros
      emoji_notaria: '🏛️',
      emoji_documento: '📄',
      emoji_codigo: '🔢',
      emoji_escritura: '📋',
      emoji_importante: '⚠️',
      emoji_direccion: '📍',
      emoji_horario: '⏰',
      emoji_reloj: '⏰'
    };

    // Reemplazar variables
    let preview = mensaje;
    Object.keys(datosEjemplo).forEach(variable => {
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      preview = preview.replace(regex, datosEjemplo[variable]);
    });

    res.json({
      success: true,
      data: {
        preview,
        datosEjemplo,
        variablesEncontradas: Object.keys(datosEjemplo).filter(variable =>
          mensaje.includes(`{${variable}}`)
        )
      }
    });
  } catch (error) {
    console.error('Error generando preview:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Obtener template activo por tipo (para uso del servicio WhatsApp)
 */
export const getActiveTemplateByType = async (tipo) => {
  try {
    const template = await prisma.whatsAppTemplate.findFirst({
      where: {
        tipo: tipo,
        activo: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Si no hay template activo, usar el predeterminado
    if (!template) {
      return {
        titulo: DEFAULT_TEMPLATES[tipo].titulo,
        mensaje: DEFAULT_TEMPLATES[tipo].mensaje
      };
    }

    return template;
  } catch (error) {
    console.error('Error obteniendo template activo:', error);
    // Fallback a template predeterminado en caso de error
    return {
      titulo: DEFAULT_TEMPLATES[tipo]?.titulo || 'Template Predeterminado',
      mensaje: DEFAULT_TEMPLATES[tipo]?.mensaje || 'Mensaje predeterminado'
    };
  }
};

/**
 * Inicializar templates por defecto (para setup inicial)
 */
export const initializeDefaultTemplates = async (req, res) => {
  try {
    const existingTemplates = await prisma.whatsAppTemplate.count();

    if (existingTemplates > 0) {
      return res.json({
        success: true,
        message: 'Templates ya existen en el sistema'
      });
    }

    const templates = await Promise.all(
      Object.entries(DEFAULT_TEMPLATES).map(([tipo, data]) =>
        prisma.whatsAppTemplate.create({
          data: {
            tipo,
            titulo: data.titulo,
            mensaje: data.mensaje,
            activo: true
          }
        })
      )
    );

    res.json({
      success: true,
      data: templates,
      message: `${templates.length} templates por defecto creados`
    });
  } catch (error) {
    console.error('Error inicializando templates por defecto:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};