import { EcuadorPatterns, FieldExtractor } from '../utils/ecuador-patterns.js';

/**
 * Servicio de extracción avanzada basado en patrones ecuatorianos.
 * No reemplaza al parser existente; lo complementa.
 */
const AdvancedExtractionService = {
  /**
   * Detecta el tipo de trámite en base al texto completo.
   */
  detectTramiteType(text) {
    const upper = String(text || '').toUpperCase();
    const tests = [
      { type: 'COMPRAVENTA', words: ['COMPRAVENTA', 'COMPRA VENTA', 'VENTA', 'ADQUISICION', 'TRANSFERENCIA DOMINIO'] },
      { type: 'DONACION', words: ['DONACION', 'DONATIVO', 'LIBERALIDAD', 'GRATUITO'] },
      { type: 'CONSTITUCION_SOCIEDAD', words: ['CONSTITUCION', 'SOCIEDAD ANONIMA', 'CIA LTDA', 'COMPAÑIA LIMITADA', 'S.A.'] },
      { type: 'FIDEICOMISO', words: ['FIDEICOMISO', 'FIDUCIARIO', 'FIDEICOMITENTE', 'BENEFICIARIO FIDEICOMISO'] },
      { type: 'CONSORCIO', words: ['CONSORCIO', 'UNION TEMPORAL', 'JOINT VENTURE'] },
      { type: 'VEHICULO', words: ['VEHICULO', 'AUTOMOVIL', 'MOTOCICLETA', 'CAMIONETA', 'PLACA', 'MOTOR', 'CHASIS'] },
      { type: 'DILIGENCIA', words: ['DILIGENCIA', 'DECLARACION', 'TESTIMONIO', 'ACTA'] },
    ];
    for (const t of tests) {
      if (t.words.some((w) => upper.includes(w))) return t.type;
    }
    return 'OTRO';
  },

  /**
   * Extrae campos usando patrones robustos (cedula, ruc, fechas, montos, etc.).
   */
  extractFields(text) {
    return FieldExtractor.extractAllFields(text);
  },

  /**
   * Señales específicas de extracto/diligencia (rápido, por palabras clave).
   */
  detectDocumentType(text) {
    const upper = String(text || '').toUpperCase();
    const extracto = ['EXTRACTO', 'VALOR OPERACION', 'ARTICULO 29', 'ESCRITURA PUBLICA', 'NOTARIO'];
    const diligencia = ['DILIGENCIA', 'DECLARACION', 'TESTIMONIO', 'RECONOCIMIENTO', 'ACTA NOTARIAL'];
    if (extracto.some((k) => upper.includes(k))) return 'PDF_EXTRACTO';
    if (diligencia.some((k) => upper.includes(k))) return 'PDF_DILIGENCIA';
    return 'PDF_EXTRACTO';
  },

  /**
   * Extrae señales típicas de Art. 29, valor operación y forma de pago.
   */
  extractExtractoSignals(text) {
    const fields = [];
    const upper = String(text || '').toUpperCase();
    if (EcuadorPatterns.articulo29.test(upper)) {
      fields.push({ fieldName: 'articulo_29', value: 'true', confidence: 0.95, type: 'other', validationStatus: 'valid' });
    }
    // Valor operación cerca de montos
    const valorIdx = [...String(text || '').matchAll(EcuadorPatterns.valorOperacion)].map((m) => m.index || 0);
    const amounts = [...String(text || '').matchAll(EcuadorPatterns.amount)];
    if (valorIdx.length && amounts.length) {
      for (const a of amounts) {
        const i = a.index || 0;
        if (valorIdx.some((v) => Math.abs(v - i) < 200)) {
          fields.push({ fieldName: 'valor_operacion', value: a[0], confidence: 0.9, type: 'valor_operacion', validationStatus: 'valid' });
          break;
        }
      }
    }
    // Forma de pago (contexto local)
    const forma = [...String(text || '').matchAll(EcuadorPatterns.formaPago)];
    if (forma.length) {
      const idx = forma[0].index || 0;
      const context = String(text || '').substring(Math.max(0, idx - 50), Math.min(String(text || '').length, idx + 300)).toUpperCase();
      for (const k of ['CONTADO', 'CREDITO', 'FINANCIADO', 'HIPOTECA', 'PRESTAMO', 'CHEQUE', 'TRANSFERENCIA']) {
        if (context.includes(k)) {
          fields.push({ fieldName: 'forma_pago', value: k, confidence: 0.85, type: 'forma_pago', validationStatus: 'valid' });
          break;
        }
      }
    }
    // Escritura/Repertorio
    for (const m of String(text || '').matchAll(EcuadorPatterns.escrituraNumber)) {
      if (m[1]) fields.push({ fieldName: 'numero_escritura', value: m[1], confidence: 0.9, type: 'other', validationStatus: 'valid' });
    }
    for (const m of String(text || '').matchAll(EcuadorPatterns.escrituraCompleteNumber)) {
      if (m[1]) fields.push({ fieldName: 'numero_escritura_completo', value: m[1], confidence: 0.95, type: 'other', validationStatus: 'valid' });
    }
    for (const m of String(text || '').matchAll(EcuadorPatterns.repertorioNumber)) {
      if (m[1]) fields.push({ fieldName: 'numero_repertorio', value: m[1], confidence: 0.9, type: 'other', validationStatus: 'valid' });
    }
    return fields;
  },

  /**
   * API principal: dado texto plano, devuelve campos extraídos y señales clave.
   */
  extractFromText(text) {
    const start = Date.now();
    const baseFields = this.extractFields(text);
    const docType = this.detectDocumentType(text);
    const tramiteType = this.detectTramiteType(text);
    const extra = docType === 'PDF_EXTRACTO' ? this.extractExtractoSignals(text) : [];
    const fields = [...baseFields, ...extra];

    // Confianza simple: media de campos (si no hay, 0)
    const confidence = fields.length ? Math.min(0.99, fields.reduce((s, f) => s + (f.confidence || 0.7), 0) / fields.length) : 0;

    return {
      documentType: docType,
      tramiteType,
      fields,
      structuredData: {},
      processingTime: Date.now() - start,
      success: true,
      confidence,
      metadata: {
        ocrEngine: 'N/A',
        extractorVersion: 'adapter-1.0.0',
        processingDate: new Date(),
      },
    };
  },
};

export default AdvancedExtractionService;

