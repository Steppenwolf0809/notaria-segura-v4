/**
 * Utilidades para generar PDFs profesionales de formularios UAFE
 * Diseño basado en el formulario oficial de la Notaría 18
 */

// Colores institucionales
export const COLORS = {
  primary: '#1e5a8e',      // Azul institucional
  white: '#ffffff',
  lightGray: '#f8f9fa',
  borderGray: '#dee2e6',
  textDark: '#333333',
  textMedium: '#555555',
  textLight: '#999999',
  lightBlue: '#e3f2fd',
  disclaimerBg: '#f5f5f5',
  disclaimerBorder: '#cccccc'
};

// Fuentes
export const FONTS = {
  title: 'Helvetica-Bold',
  normal: 'Helvetica',
  italic: 'Helvetica-Oblique'
};

/**
 * Formatear moneda en dólares americanos
 */
export function formatCurrency(amount) {
  if (!amount && amount !== 0) return 'No aplica';
  return `$${Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

/**
 * Formatear fecha en formato largo español
 */
export function formatDate(dateString) {
  if (!dateString) return 'No aplica';
  const date = new Date(dateString);
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
}

/**
 * Formatear timestamp para footer
 */
export function formatTimestamp() {
  const now = new Date();
  const date = now.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const time = now.toLocaleTimeString('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return `Generado el ${date} a las ${time}`;
}

/**
 * Dibujar header del PDF
 */
export function drawHeader(doc) {
  const headerHeight = 120;

  // Borde principal del header
  doc.rect(50, 50, 500, headerHeight)
     .lineWidth(2)
     .stroke(COLORS.primary);

  // === COLUMNA IZQUIERDA (Logo y notaría) ===
  const leftX = 60;
  const topY = 60;

  // Logo placeholder - Círculo azul con "N18"
  doc.circle(leftX + 30, topY + 30, 25)
     .fillAndStroke(COLORS.primary, COLORS.primary);

  doc.fillColor(COLORS.white)
     .fontSize(16)
     .font(FONTS.title)
     .text('N18', leftX + 17, topY + 22);

  // Texto "NOTARÍA 18"
  doc.fillColor(COLORS.primary)
     .fontSize(14)
     .font(FONTS.title)
     .text('NOTARÍA 18', leftX, topY + 65);

  // Subtexto notaria
  doc.fillColor(COLORS.textMedium)
     .fontSize(9)
     .font(FONTS.normal)
     .text('Dra. Glenda Zapata Silva', leftX, topY + 82);

  doc.text('Notaria Décima Octava', leftX, topY + 95);

  // === COLUMNA DERECHA (Títulos del formulario) ===
  const rightX = 220;

  // Título principal
  doc.fillColor(COLORS.primary)
     .fontSize(14)
     .font(FONTS.title)
     .text('FORMULARIO DE DEBIDA DILIGENCIA', rightX, topY + 10, {
       width: 300,
       align: 'center'
     });

  doc.fontSize(12)
     .text('CONOZCA A SU USUARIO', rightX, topY + 30, {
       width: 300,
       align: 'center'
     });

  // Box azul "PERSONAS NATURALES/JURÍDICAS"
  const boxY = topY + 55;
  doc.rect(rightX + 50, boxY, 200, 30)
     .fill(COLORS.primary);

  doc.fillColor(COLORS.white)
     .fontSize(12)
     .font(FONTS.title)
     .text('PERSONAS NATURALES', rightX + 55, boxY + 10, {
       width: 190,
       align: 'center'
     });

  return 180; // Retorna posición Y después del header
}

/**
 * Dibujar disclaimer UAFE
 */
export function drawDisclaimer(doc, y) {
  const disclaimerHeight = 70;
  const disclaimerText = `De conformidad con las disposiciones contenidas en la Ley de Prevención, Detección y Erradicación del Delito de Lavado de Activos y del Financiamiento de Delitos, sus reglamentos, y demás normativa emitida por la Unidad de Análisis Financiero y Económico (UAFE), es obligatorio llenar este formulario con letra legible y en su totalidad. La información proporcionada es de carácter confidencial y será utilizada únicamente para cumplir con las obligaciones de debida diligencia establecidas en la normativa vigente.`;

  // Fondo gris
  doc.rect(50, y, 500, disclaimerHeight)
     .fillAndStroke(COLORS.disclaimerBg, COLORS.disclaimerBorder);

  // Texto del disclaimer
  doc.fillColor(COLORS.textDark)
     .fontSize(8)
     .font(FONTS.normal)
     .text(disclaimerText, 60, y + 10, {
       width: 480,
       align: 'justify',
       lineGap: 2
     });

  return y + disclaimerHeight + 20; // Retorna posición Y después del disclaimer
}

/**
 * Dibujar caja con información del protocolo
 */
export function drawProtocolBox(doc, y, protocolo, rol, calidad) {
  const boxHeight = 90;

  // Fondo azul claro
  doc.rect(50, y, 500, boxHeight)
     .fillAndStroke(COLORS.lightBlue, COLORS.primary);

  // Título
  doc.fillColor(COLORS.primary)
     .fontSize(12)
     .font(FONTS.title)
     .text('INFORMACIÓN DEL TRÁMITE', 60, y + 10);

  // Grid de datos
  const dataY = y + 30;
  const col1 = 60;
  const col2 = 280;

  // Protocolo y Fecha
  drawInlineField(doc, col1, dataY, 'No. Protocolo:', protocolo.numeroProtocolo, 120);
  drawInlineField(doc, col2, dataY, 'Fecha:', formatDate(protocolo.fecha), 150);

  // Acto/Contrato
  drawInlineField(doc, col1, dataY + 20, 'Acto/Contrato:', protocolo.actoContrato, 400);

  // Valores
  drawInlineField(doc, col1, dataY + 40, 'Valor Contrato:', formatCurrency(protocolo.valorContrato), 150);
  if (protocolo.avaluoMunicipal) {
    drawInlineField(doc, col2, dataY + 40, 'Avalúo Municipal:', formatCurrency(protocolo.avaluoMunicipal), 150);
  }

  // Rol de la persona
  drawInlineField(doc, col1, dataY + 60, 'Calidad:', `${rol} (${calidad})`, 400);

  return y + boxHeight + 20; // Retorna posición Y después del box
}

/**
 * Dibujar campo inline (label: valor en la misma línea)
 */
function drawInlineField(doc, x, y, label, value, maxWidth) {
  const currentColor = doc._fillColor;

  // Label en negrita
  doc.fillColor(COLORS.textDark)
     .fontSize(9)
     .font(FONTS.title)
     .text(label, x, y);

  // Calcular ancho del label
  const labelWidth = doc.widthOfString(label);

  // Valor normal
  doc.font(FONTS.normal)
     .text(value || 'No aplica', x + labelWidth + 5, y, {
       width: maxWidth - labelWidth - 5
     });

  doc._fillColor = currentColor;
}

/**
 * Dibujar sección con header azul
 */
export function drawSection(doc, y, title, contentHeight) {
  // Header azul
  doc.rect(50, y, 500, 25)
     .fill(COLORS.primary);

  doc.fillColor(COLORS.white)
     .fontSize(11)
     .font(FONTS.title)
     .text(title.toUpperCase(), 60, y + 7);

  // Borde de contenido
  doc.rect(50, y + 25, 500, contentHeight)
     .stroke(COLORS.primary);

  return y + 25 + 10; // Retorna posición Y para el contenido
}

/**
 * Dibujar campo individual con label arriba y valor abajo
 */
export function drawField(doc, x, y, label, value, width = 150) {
  // Label
  doc.fillColor(COLORS.textMedium)
     .fontSize(9)
     .font(FONTS.title)
     .text(label, x, y);

  // Caja para el valor
  doc.rect(x, y + 14, width, 24)
     .fillAndStroke(COLORS.lightGray, COLORS.borderGray);

  // Valor
  const displayValue = value || 'No aplica';
  const hasValue = value !== null && value !== undefined && value !== '';

  doc.fillColor(hasValue ? COLORS.textDark : COLORS.textLight)
     .fontSize(10)
     .font(hasValue ? FONTS.normal : FONTS.italic)
     .text(displayValue, x + 6, y + 19, {
       width: width - 12,
       lineBreak: false,
       ellipsis: true
     });
}

/**
 * Dibujar campo de área de texto (multi-línea)
 */
export function drawTextAreaField(doc, x, y, label, value, width = 480, height = 40) {
  // Label
  doc.fillColor(COLORS.textMedium)
     .fontSize(9)
     .font(FONTS.title)
     .text(label, x, y);

  // Caja para el valor
  doc.rect(x, y + 14, width, height)
     .fillAndStroke(COLORS.lightGray, COLORS.borderGray);

  // Valor
  const displayValue = value || 'No aplica';
  const hasValue = value !== null && value !== undefined && value !== '';

  doc.fillColor(hasValue ? COLORS.textDark : COLORS.textLight)
     .fontSize(10)
     .font(hasValue ? FONTS.normal : FONTS.italic)
     .text(displayValue, x + 6, y + 19, {
       width: width - 12,
       height: height - 10
     });
}

/**
 * Dibujar sección de firma
 */
export function drawSignature(doc, y, nombre, cedula) {
  const signatureY = y + 40;

  // Línea para firma
  doc.moveTo(200, signatureY)
     .lineTo(400, signatureY)
     .stroke(COLORS.textDark);

  // Texto "Firma del Compareciente"
  doc.fillColor(COLORS.textMedium)
     .fontSize(10)
     .font(FONTS.title)
     .text('Firma del Compareciente', 200, signatureY + 10, {
       width: 200,
       align: 'center'
     });

  // Nombre completo
  doc.fontSize(9)
     .font(FONTS.normal)
     .text(nombre, 200, signatureY + 25, {
       width: 200,
       align: 'center'
     });

  // Cédula
  doc.text(`C.I.: ${cedula}`, 200, signatureY + 38, {
    width: 200,
    align: 'center'
  });

  return signatureY + 60; // Retorna posición Y después de la firma
}

/**
 * Dibujar footer del PDF
 */
export function drawFooter(doc) {
  const footerY = 750;

  // Línea superior azul
  doc.moveTo(50, footerY)
     .lineTo(550, footerY)
     .lineWidth(2)
     .stroke(COLORS.primary);

  // Timestamp
  doc.fillColor(COLORS.textLight)
     .fontSize(8)
     .font(FONTS.italic)
     .text(formatTimestamp(), 50, footerY + 10, {
       width: 500,
       align: 'center'
     });

  // Texto simple de página (sin numerar porque es PDF de una sola página por persona)
  doc.fillColor(COLORS.textLight)
     .fontSize(8)
     .font(FONTS.normal)
     .text(
       'Formulario UAFE - Notaría 18',
       50,
       footerY + 24,
       { width: 500, align: 'center' }
     );
}

/**
 * Obtener nombre completo de persona natural
 */
export function getNombreCompleto(datos) {
  if (!datos || !datos.datosPersonales) return 'Sin nombre';
  const { nombres, apellidos } = datos.datosPersonales;
  return `${nombres || ''} ${apellidos || ''}`.trim() || 'Sin nombre';
}

/**
 * Verificar si necesita nueva página y agregarla si es necesario
 */
export function checkAndAddPage(doc, currentY, requiredSpace = 100) {
  if (currentY + requiredSpace > 720) {
    doc.addPage();
    return 50; // Volver a la parte superior de la nueva página
  }
  return currentY;
}
