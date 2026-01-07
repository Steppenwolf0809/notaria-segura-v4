/**
 * Utilidades para generar PDFs profesionales de formularios UAFE
 * Diseño basado en el formulario oficial de la Notaría 18
 */

import fs from 'fs';

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
 * Formatear fecha en formato largo español con timezone Ecuador
 */
export function formatDate(dateString) {
  if (!dateString) return 'No aplica';
  const date = new Date(dateString);

  // Obtener componentes de fecha en timezone Ecuador
  const options = {
    timeZone: 'America/Guayaquil',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  };

  const formatter = new Intl.DateTimeFormat('es-EC', options);
  const parts = formatter.formatToParts(date);

  const day = parts.find(p => p.type === 'day')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const year = parts.find(p => p.type === 'year')?.value || '';

  return `${day} de ${month} de ${year}`;
}

/**
 * Formatear timestamp para footer con timezone Ecuador
 */
export function formatTimestamp() {
  const now = new Date();

  // Formatear fecha y hora en timezone Ecuador
  const options = {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('es-EC', options);
  const parts = formatter.formatToParts(now);

  const day = parts.find(p => p.type === 'day')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const year = parts.find(p => p.type === 'year')?.value || '';
  const hour = parts.find(p => p.type === 'hour')?.value || '';
  const minute = parts.find(p => p.type === 'minute')?.value || '';
  const second = parts.find(p => p.type === 'second')?.value || '';

  return `Generado el ${day} de ${month} de ${year}, ${hour}:${minute}:${second}`;
}

/**
 * Dibujar header del PDF (VERSIÓN COMPACTA)
 */
export function drawHeader(doc, logoPath = null) {
  const headerHeight = 70; // Reducido de 120 a 70

  // Borde principal del header
  doc.rect(40, 40, 520, headerHeight)
    .lineWidth(1.5)
    .stroke(COLORS.primary);

  // === COLUMNA IZQUIERDA (Logo y notaría) ===
  const leftX = 50;
  const topY = 45;

  // Logo - Intentar cargar imagen o usar placeholder (más pequeño: 40x40)
  try {
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, leftX, topY, { width: 40, height: 40 });
    } else {
      // Logo placeholder - Círculo azul con "N18"
      doc.circle(leftX + 20, topY + 20, 18)
        .fillAndStroke(COLORS.primary, COLORS.primary);

      doc.fillColor(COLORS.white)
        .fontSize(12)
        .font(FONTS.title)
        .text('N18', leftX + 12, topY + 14);
    }
  } catch (error) {
    // Fallback a placeholder si hay error
    doc.circle(leftX + 20, topY + 20, 18)
      .fillAndStroke(COLORS.primary, COLORS.primary);

    doc.fillColor(COLORS.white)
      .fontSize(12)
      .font(FONTS.title)
      .text('N18', leftX + 12, topY + 14);
  }

  // Texto "NOTARÍA 18" compacto
  doc.fillColor(COLORS.primary)
    .fontSize(11)
    .font(FONTS.title)
    .text('NOTARÍA 18', leftX + 50, topY + 5);

  // Subtexto notaria compacto
  doc.fillColor(COLORS.textMedium)
    .fontSize(7)
    .font(FONTS.normal)
    .text('Dra. Glenda Zapata Silva', leftX + 50, topY + 20);

  doc.fontSize(7)
    .text('Notaria Décima Octava', leftX + 50, topY + 30);

  // === COLUMNA DERECHA (Títulos del formulario) - Compacta ===
  const rightX = 250;

  // Título principal
  doc.fillColor(COLORS.primary)
    .fontSize(11)
    .font(FONTS.title)
    .text('FORMULARIO DE DEBIDA DILIGENCIA', rightX, topY + 8, {
      width: 280,
      align: 'center'
    });

  doc.fontSize(10)
    .text('CONOZCA A SU USUARIO', rightX, topY + 24, {
      width: 280,
      align: 'center'
    });

  // Box azul "PERSONAS NATURALES" compacto
  const boxY = topY + 42;
  doc.rect(rightX + 60, boxY, 160, 20)
    .fill(COLORS.primary);

  doc.fillColor(COLORS.white)
    .fontSize(9)
    .font(FONTS.title)
    .text('PERSONAS NATURALES', rightX + 65, boxY + 6, {
      width: 150,
      align: 'center'
    });

  return 125; // Retorna posición Y después del header (reducido de 180 a 125)
}

/**
 * Dibujar disclaimer UAFE (VERSIÓN COMPACTA)
 */
export function drawDisclaimer(doc, y) {
  const disclaimerHeight = 50; // Reducido de 70 a 50
  const disclaimerText = `De conformidad con la normativa UAFE, es obligatorio llenar este formulario en su totalidad. La información es confidencial y será utilizada únicamente para cumplir con las obligaciones de debida diligencia.`;

  // Fondo gris
  doc.rect(40, y, 520, disclaimerHeight)
    .fillAndStroke(COLORS.disclaimerBg, COLORS.disclaimerBorder);

  // Texto del disclaimer
  doc.fillColor(COLORS.textDark)
    .fontSize(7)
    .font(FONTS.normal)
    .text(disclaimerText, 50, y + 8, {
      width: 500,
      align: 'justify',
      lineGap: 1
    });

  return y + disclaimerHeight + 12; // Retorna posición Y después del disclaimer (reducido de 20 a 12)
}

/**
 * Dibujar caja con información del protocolo (VERSIÓN COMPACTA)
 */
export function drawProtocolBox(doc, y, protocolo, rol, calidad) {
  const boxHeight = 85; // Aumentado para dar espacio a la última línea

  // Fondo azul claro
  doc.rect(40, y, 520, boxHeight)
    .fillAndStroke(COLORS.lightBlue, COLORS.primary);

  // Título
  doc.fillColor(COLORS.primary)
    .fontSize(10)
    .font(FONTS.title)
    .text('INFORMACIÓN DEL TRÁMITE', 50, y + 6);

  // Grid de datos (más compacto)
  const dataY = y + 20;
  const col1 = 50;
  const col2 = 300;

  // Protocolo y Fecha en una línea
  drawInlineField(doc, col1, dataY, 'No. Protocolo:', protocolo.numeroProtocolo, 200);
  drawInlineField(doc, col2, dataY, 'Fecha:', formatDate(protocolo.fecha), 140);

  // Acto/Contrato
  drawInlineField(doc, col1, dataY + 14, 'Acto/Contrato:', protocolo.actoContrato, 420);

  // Valores
  drawInlineField(doc, col1, dataY + 28, 'Valor Contrato:', formatCurrency(protocolo.valorContrato), 130);
  if (protocolo.avaluoMunicipal) {
    drawInlineField(doc, col2, dataY + 28, 'Avalúo Municipal:', formatCurrency(protocolo.avaluoMunicipal), 130);
  }

  // Rol de la persona
  drawInlineField(doc, col1, dataY + 42, 'Calidad:', `${rol} (${calidad})`, 420);

  return y + boxHeight + 15; // Retorna posición Y después del box (margen inferior aumentado para evitar overlap)
}

/**
 * Helper para dibujar texto con auto-escalado si es muy largo
 */
function drawScaledText(doc, text, x, y, maxWidth, initialFontSize, font) {
  let fontSize = initialFontSize;
  doc.font(font).fontSize(fontSize);

  while (doc.widthOfString(text) > maxWidth && fontSize > 6) {
    fontSize -= 0.5;
    doc.fontSize(fontSize);
  }

  doc.text(text, x, y);
}

/**
 * Dibujar campo inline (label: valor en la misma línea) - VERSIÓN COMPACTA MEJORADA
 */
function drawInlineField(doc, x, y, label, value, maxWidth) {
  const currentColor = doc._fillColor;

  // Label en negrita (tamaño reducido)
  doc.fillColor(COLORS.textDark)
    .fontSize(8)
    .font(FONTS.title)
    .text(label, x, y);

  // Calcular ancho del label
  const labelWidth = doc.widthOfString(label);
  const valueMaxWidth = maxWidth - labelWidth - 4;

  // Valor con auto-escalado si es necesario
  const displayValue = value || 'No aplica';

  if (label === 'No. Protocolo:') {
    // Tratamiento especial para Protocolo: Validación de espacio y ajuste
    doc.fillColor(COLORS.textDark); // Asegurar color
    drawScaledText(doc, displayValue, x + labelWidth + 4, y, valueMaxWidth, 10, FONTS.title);
  } else {
    // Valor normal
    doc.fontSize(8)
      .font(FONTS.normal)
      .text(displayValue, x + labelWidth + 4, y, {
        width: valueMaxWidth
      });
  }

  doc._fillColor = currentColor;
}

/**
 * Dibujar sección con header azul (VERSIÓN COMPACTA)
 */
export function drawSection(doc, y, title, contentHeight) {
  // Header azul (más delgado)
  doc.rect(40, y, 520, 20)
    .fill(COLORS.primary);

  doc.fillColor(COLORS.white)
    .fontSize(9)
    .font(FONTS.title)
    .text(title.toUpperCase(), 50, y + 5);

  // Borde de contenido
  doc.rect(40, y + 20, 520, contentHeight)
    .stroke(COLORS.primary);

  return y + 20 + 6; // Retorna posición Y para el contenido (reducido de 10 a 6)
}

/**
 * Dibujar campo individual con label arriba y valor abajo (VERSIÓN COMPACTA)
 */
export function drawField(doc, x, y, label, value, width = 150) {
  // Label (tamaño reducido)
  doc.fillColor(COLORS.textMedium)
    .fontSize(7)
    .font(FONTS.title)
    .text(label, x, y);

  // Caja para el valor (más delgada)
  doc.rect(x, y + 11, width, 18)
    .fillAndStroke(COLORS.lightGray, COLORS.borderGray);

  // Valor
  const displayValue = value || 'No aplica';
  const hasValue = value !== null && value !== undefined && value !== '';

  doc.fillColor(hasValue ? COLORS.textDark : COLORS.textLight)
    .fontSize(8)
    .font(hasValue ? FONTS.normal : FONTS.italic)
    .text(displayValue, x + 5, y + 14, {
      width: width - 10,
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
  const signatureY = y + 20; // Reducido margen superior de 40 a 20

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
 * Obtener nombre completo de persona (natural o jurídica)
 */
export function getNombreCompleto(datos) {
  if (!datos) return 'Sin nombre';

  // Persona Natural
  if (datos.datosPersonales) {
    const { nombres, apellidos } = datos.datosPersonales;
    return `${nombres || ''} ${apellidos || ''}`.trim() || 'Sin nombre';
  }

  // Persona Jurídica
  if (datos.compania?.razonSocial) {
    return datos.compania.razonSocial;
  }

  // Representante Legal de Persona Jurídica
  if (datos.representanteLegal) {
    const { nombres, apellidos } = datos.representanteLegal;
    return `${nombres || ''} ${apellidos || ''}`.trim() || 'Sin nombre';
  }

  return 'Sin nombre';
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

/**
 * Dibujar sección de bienes (inmueble o vehículo) según el tipo de acto
 */
export function drawBienesSection(doc, y, protocolo) {
  // Tipos que requieren datos de bien inmueble
  const TIPOS_BIEN_INMUEBLE = ['COMPRAVENTA', 'DONACION', 'CESION_DERECHOS', 'PROMESA_COMPRAVENTA'];
  // Tipos que requieren datos de vehículo
  const TIPOS_VEHICULO = ['VENTA_VEHICULO'];

  const acto = protocolo.actoContrato;

  // Verificar si hay datos de bien inmueble
  if (TIPOS_BIEN_INMUEBLE.includes(acto) && (protocolo.bienInmuebleDescripcion || protocolo.bienInmuebleUbicacion)) {
    // Sección de bien inmueble
    y = checkAndAddPage(doc, y, 80);
    y = drawSection(doc, y, 'Datos del Bien Inmueble', 60);

    drawTextAreaField(doc, 60, y, 'Descripción del Inmueble', protocolo.bienInmuebleDescripcion, 480, 22);
    y += 40;
    drawTextAreaField(doc, 60, y, 'Ubicación del Inmueble', protocolo.bienInmuebleUbicacion, 480, 22);
    y += 50;
  }

  // Verificar si hay datos de vehículo
  if (TIPOS_VEHICULO.includes(acto) && (protocolo.vehiculoPlaca || protocolo.vehiculoMarca || protocolo.vehiculoModelo || protocolo.vehiculoAnio)) {
    // Sección de vehículo
    y = checkAndAddPage(doc, y, 80);
    y = drawSection(doc, y, 'Datos del Vehículo', 45);

    drawField(doc, 60, y, 'Placa', protocolo.vehiculoPlaca, 120);
    drawField(doc, 200, y, 'Marca', protocolo.vehiculoMarca, 140);
    drawField(doc, 360, y, 'Modelo', protocolo.vehiculoModelo, 100);
    drawField(doc, 480, y, 'Año', protocolo.vehiculoAnio, 60);
    y += 55;
  }

  return y;
}

/**
 * Dibujar tabla de formas de pago
 */
export function drawFormasPago(doc, y, formasPago) {
  if (!formasPago || formasPago.length === 0) {
    return y;
  }

  // Título de la sección
  doc.fillColor(COLORS.primary)
    .fontSize(11)
    .font(FONTS.title)
    .text('FORMAS DE PAGO', 60, y);

  y += 20;

  // Dibujar tabla
  const tableX = 60;
  const tableWidth = 480;
  const colWidths = [200, 140, 140]; // TIPO, MONTO, BANCO

  // Header de la tabla
  doc.rect(tableX, y, tableWidth, 25)
    .fill(COLORS.primary);

  doc.fillColor(COLORS.white)
    .fontSize(9)
    .font(FONTS.title);

  doc.text('TIPO', tableX + 5, y + 8, { width: colWidths[0] - 10 });
  doc.text('MONTO', tableX + colWidths[0] + 5, y + 8, { width: colWidths[1] - 10 });
  doc.text('BANCO', tableX + colWidths[0] + colWidths[1] + 5, y + 8, { width: colWidths[2] - 10 });

  y += 25;

  // Filas de datos
  let rowY = y;
  let totalMonto = 0;

  formasPago.forEach((fp, index) => {
    const monto = parseFloat(fp.monto) || 0;
    totalMonto += monto;

    // Fondo alternado para legibilidad
    if (index % 2 === 0) {
      doc.rect(tableX, rowY, tableWidth, 24)
        .fillAndStroke(COLORS.lightGray, COLORS.borderGray);
    } else {
      doc.rect(tableX, rowY, tableWidth, 24)
        .stroke(COLORS.borderGray);
    }

    // Contenido de la fila
    doc.fillColor(COLORS.textDark)
      .fontSize(9)
      .font(FONTS.normal);

    doc.text(fp.tipo || 'N/A', tableX + 5, rowY + 7, { width: colWidths[0] - 10 });
    doc.text(formatCurrency(monto), tableX + colWidths[0] + 5, rowY + 7, { width: colWidths[1] - 10 });
    doc.text(fp.banco || '-', tableX + colWidths[0] + colWidths[1] + 5, rowY + 7, { width: colWidths[2] - 10 });

    rowY += 24;
  });

  // Fila de total
  doc.rect(tableX, rowY, tableWidth, 25)
    .fillAndStroke(COLORS.lightBlue, COLORS.primary);

  doc.fillColor(COLORS.primary)
    .fontSize(10)
    .font(FONTS.title)
    .text('TOTAL:', tableX + 5, rowY + 8, { width: colWidths[0] + colWidths[1] - 10, align: 'right' });

  doc.text(formatCurrency(totalMonto), tableX + colWidths[0] + colWidths[1] + 5, rowY + 8, { width: colWidths[2] - 10 });

  return rowY + 35; // Retornar posición Y después de la tabla
}
