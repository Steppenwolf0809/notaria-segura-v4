import fs from 'fs-extra';
import { parseStringPromise } from 'xml2js';

export class XmlValidator {
  constructor({ logger }) {
    this.logger = logger;
  }

  /**
   * Valida un archivo XML
   * @param {string} filePath - Ruta del archivo XML
   * @returns {Promise<{valid: boolean, error?: string, details?: object}>}
   */
  async validateFile(filePath) {
    try {
      // 1. Verificar que el archivo existe
      const exists = await fs.pathExists(filePath);
      if (!exists) {
        return { valid: false, error: 'Archivo no existe' };
      }

      // 2. Verificar tamaño mínimo
      const stats = await fs.stat(filePath);
      if (stats.size < 100) {
        return { valid: false, error: 'Archivo demasiado pequeño (< 100 bytes)' };
      }

      // 3. Leer contenido
      const content = await fs.readFile(filePath, 'utf-8');

      // 4. Verificar que contiene texto XML básico
      if (!content.trim().startsWith('<?xml') && !content.trim().startsWith('<factura')) {
        return { valid: false, error: 'No parece un archivo XML válido' };
      }

      // 5. Parsear XML
      let parsed;
      try {
        parsed = await parseStringPromise(content, {
          trim: true,
          explicitArray: false,
          strict: false
        });
      } catch (parseErr) {
        return {
          valid: false,
          error: `Error al parsear XML: ${parseErr.message}`,
          parseError: parseErr.message
        };
      }

      // 6. Validar estructura básica de factura
      if (!parsed.factura) {
        return { valid: false, error: 'XML no contiene elemento <factura>' };
      }

      // 7. Validar campos críticos
      const validation = this._validateFacturaStructure(parsed.factura);
      if (!validation.valid) {
        return validation;
      }

      // Todo OK
      return {
        valid: true,
        details: {
          size: stats.size,
          hasInfoFactura: !!parsed.factura.infoFactura,
          hasInfoAdicional: !!parsed.factura.infoAdicional,
          hasDetalles: !!parsed.factura.detalles
        }
      };

    } catch (err) {
      this.logger.error(`Error validando XML ${filePath}: ${err.message}`);
      return {
        valid: false,
        error: `Error de validación: ${err.message}`
      };
    }
  }

  /**
   * Valida la estructura de una factura
   * @private
   */
  _validateFacturaStructure(factura) {
    // Verificar infoFactura
    if (!factura.infoFactura) {
      return { valid: false, error: 'Falta elemento <infoFactura>' };
    }

    // Verificar campos mínimos en infoFactura
    const info = factura.infoFactura;
    if (!info.razonSocialComprador && !info.nombreCliente) {
      return {
        valid: false,
        error: 'Falta razonSocialComprador o nombreCliente en infoFactura'
      };
    }

    // Verificar infoAdicional
    if (!factura.infoAdicional) {
      return { valid: false, error: 'Falta elemento <infoAdicional>' };
    }

    // Verificar que tenga campos adicionales
    const camposAdicionales = factura.infoAdicional.campoAdicional;
    if (!camposAdicionales) {
      return {
        valid: false,
        error: 'No hay campos adicionales en infoAdicional'
      };
    }

    // Convertir a array si es un solo elemento
    const campos = Array.isArray(camposAdicionales)
      ? camposAdicionales
      : [camposAdicionales];

    // Buscar número de libro
    const numeroLibro = campos.find(c =>
      c.$ && c.$.nombre && c.$.nombre.includes('NÚMERO DE LIBRO')
    );

    if (!numeroLibro || !numeroLibro._) {
      return {
        valid: false,
        error: 'Falta campo NÚMERO DE LIBRO en infoAdicional'
      };
    }

    // Verificar que el número de libro tenga formato válido
    const numeroLibroValue = numeroLibro._;
    if (!/\d{11}[PDACO]\d{5}/.test(numeroLibroValue)) {
      return {
        valid: false,
        error: `Número de libro con formato inválido: ${numeroLibroValue}`
      };
    }

    return { valid: true };
  }

  /**
   * Valida múltiples archivos
   * @param {string[]} filePaths
   * @returns {Promise<Array>}
   */
  async validateBatch(filePaths) {
    const results = [];
    for (const filePath of filePaths) {
      const result = await this.validateFile(filePath);
      results.push({ filePath, ...result });
    }
    return results;
  }
}
