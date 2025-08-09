import prisma from '../db.js';

/**
 * Controller para administración de templates WhatsApp
 * Funcionalidad CRUD simple con principio KISS
 */

/**
 * Variables disponibles para templates
 */
const AVAILABLE_VARIABLES = {
  cliente: 'Nombre del cliente',
  documento: 'Tipo de documento',
  codigo: 'Código de verificación 4 dígitos',
  notaria: 'Nombre de la notaría',
  fecha: 'Fecha actual formateada'
};

/**
 * Templates por defecto del sistema (fallback)
 */
const DEFAULT_TEMPLATES = {
  DOCUMENTO_LISTO: {
    titulo: 'Documento Listo para Retiro (Predeterminado)',
    mensaje: `🏛️ *{notaria}*

Estimado/a {cliente},

Su documento está listo para retiro:
📄 *Documento:* {documento}
🔢 *Código de retiro:* {codigo}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

¡Gracias por confiar en nosotros!`
  },
  DOCUMENTO_ENTREGADO: {
    titulo: 'Confirmación de Entrega (Predeterminado)',
    mensaje: `🏛️ *{notaria}*

Estimado/a {cliente},

✅ Confirmamos la entrega de su documento:
📄 *Documento:* {documento}
👤 *Retirado por:* {cliente}
📅 *Fecha y hora:* {fecha}

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

    if (!['DOCUMENTO_LISTO', 'DOCUMENTO_ENTREGADO'].includes(tipo)) {
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

    // Datos ejemplo para preview
    const datosEjemplo = {
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
      })
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