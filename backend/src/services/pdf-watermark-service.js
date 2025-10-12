/**
 * Servicio para agregar marcas de agua a PDFs
 * Usa pdf-lib para manipular PDFs sin modificar el archivo original
 * 
 * EDUCATIVO: Este servicio toma un PDF, le agrega una marca de agua diagonal
 * en todas las páginas, y devuelve un nuevo PDF sin modificar el original.
 */

import { PDFDocument, rgb, degrees } from 'pdf-lib';

/**
 * Agrega marca de agua diagonal a todas las páginas de un PDF
 * 
 * @param {Buffer} pdfBuffer - Buffer del PDF original
 * @returns {Promise<Buffer>} - Buffer del PDF con marca de agua
 * 
 * EDUCATIVO: Esta función:
 * 1. Carga el PDF desde el buffer
 * 2. Recorre todas las páginas
 * 3. Agrega texto diagonal semi-transparente
 * 4. Devuelve el PDF modificado como buffer
 */
export async function addWatermarkToPDF(pdfBuffer) {
  try {
    console.log('[pdf-watermark] Iniciando proceso de marca de agua...');
    
    // 1. Cargar el PDF desde el buffer
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    console.log(`[pdf-watermark] PDF cargado con ${pages.length} página(s)`);
    
    // 2. Configuración de la marca de agua
    const watermarkText = 'COPIA DE VERIFICACIÓN - SIN VALOR LEGAL';
    const fontSize = 40;
    const opacity = 0.3; // 30% de opacidad
    const color = rgb(0.5, 0.5, 0.5); // Gris (#808080)
    
    // 3. Agregar marca de agua a cada página
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      // Posición central de la página
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Dibujar la marca de agua diagonal (45 grados)
      page.drawText(watermarkText, {
        x: centerX - 300, // Ajustar para centrar el texto
        y: centerY,
        size: fontSize,
        color: color,
        opacity: opacity,
        rotate: degrees(45), // Rotación diagonal
      });
      
      console.log(`[pdf-watermark] Marca agregada a página ${i + 1}/${pages.length}`);
    }
    
    // 4. Serializar el PDF modificado a buffer
    const watermarkedPdfBytes = await pdfDoc.save();
    const watermarkedBuffer = Buffer.from(watermarkedPdfBytes);
    
    console.log(`[pdf-watermark] ✅ Marca de agua agregada exitosamente. Tamaño: ${(watermarkedBuffer.length / 1024).toFixed(2)} KB`);
    
    return watermarkedBuffer;
    
  } catch (error) {
    console.error('[pdf-watermark] ❌ Error agregando marca de agua:', error);
    throw new Error(`Error agregando marca de agua al PDF: ${error.message}`);
  }
}

/**
 * Valida que el buffer sea un PDF válido
 * 
 * @param {Buffer} pdfBuffer - Buffer a validar
 * @returns {boolean} - true si es un PDF válido
 */
export function validatePDFBuffer(pdfBuffer) {
  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer)) {
    return false;
  }
  
  // Verificar magic bytes de PDF (%PDF)
  const pdfSignature = pdfBuffer.slice(0, 4).toString();
  return pdfSignature === '%PDF';
}

/**
 * Agrega marca de agua personalizada al PDF
 * 
 * @param {Buffer} pdfBuffer - Buffer del PDF original
 * @param {Object} options - Opciones de personalización
 * @param {string} options.text - Texto de la marca de agua
 * @param {number} options.fontSize - Tamaño de fuente (default: 40)
 * @param {number} options.opacity - Opacidad 0-1 (default: 0.3)
 * @param {number} options.rotation - Rotación en grados (default: 45)
 * @returns {Promise<Buffer>} - Buffer del PDF con marca de agua
 * 
 * EDUCATIVO: Esta es una versión más flexible para uso futuro
 */
export async function addCustomWatermarkToPDF(pdfBuffer, options = {}) {
  try {
    const {
      text = 'COPIA DE VERIFICACIÓN - SIN VALOR LEGAL',
      fontSize = 40,
      opacity = 0.3,
      rotation = 45
    } = options;
    
    console.log('[pdf-watermark] Iniciando proceso de marca de agua personalizada...');
    
    // Cargar el PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pages = pdfDoc.getPages();
    
    console.log(`[pdf-watermark] PDF cargado con ${pages.length} página(s)`);
    
    const color = rgb(0.5, 0.5, 0.5); // Gris
    
    // Agregar marca de agua a cada página
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      
      const centerX = width / 2;
      const centerY = height / 2;
      
      page.drawText(text, {
        x: centerX - (text.length * fontSize / 4), // Aproximación para centrar
        y: centerY,
        size: fontSize,
        color: color,
        opacity: opacity,
        rotate: degrees(rotation),
      });
      
      console.log(`[pdf-watermark] Marca agregada a página ${i + 1}/${pages.length}`);
    }
    
    // Serializar el PDF modificado
    const watermarkedPdfBytes = await pdfDoc.save();
    const watermarkedBuffer = Buffer.from(watermarkedPdfBytes);
    
    console.log(`[pdf-watermark] ✅ Marca de agua personalizada agregada. Tamaño: ${(watermarkedBuffer.length / 1024).toFixed(2)} KB`);
    
    return watermarkedBuffer;
    
  } catch (error) {
    console.error('[pdf-watermark] ❌ Error agregando marca de agua personalizada:', error);
    throw new Error(`Error agregando marca de agua personalizada: ${error.message}`);
  }
}

export default {
  addWatermarkToPDF,
  addCustomWatermarkToPDF,
  validatePDFBuffer
};

