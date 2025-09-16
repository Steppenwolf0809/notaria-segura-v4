// Servicio de auditoría para concuerdos
// -------------------------------------
// Registra eventos de auditoría en base de datos

import crypto from 'crypto';
import { maskObjectPII } from '../utils/pii-masking.js';
import prisma from '../db.js';

/**
 * Registra un evento de auditoría de concuerdos
 * @param {Object} auditData - Datos de auditoría
 */
export async function logConcuerdoAudit(auditData) {
  try {
    // Generar hash del contenido para trazabilidad (antes de enmascarar)
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify({
        primera: auditData.primera || '',
        segunda: auditData.segunda || ''
      }))
      .digest('hex');

    // Enmascarar PII antes de guardar
    const safeAuditData = maskObjectPII(auditData);

    const auditRecord = {
      docId: safeAuditData.docId,
      estructura: safeAuditData.estructura,
      templateMode: safeAuditData.templateMode,
      force: safeAuditData.force,
      hashConcuerdo: contentHash,
      createdBy: safeAuditData.createdBy,
      meta: {
        ...safeAuditData.meta,
        version: '1.0',
        piiMasked: true
      }
    };

    // Persistir en base de datos dentro de transacción
    const result = await prisma.$transaction(async (tx) => {
      const audit = await tx.concuerdoAuditLog.create({
        data: auditRecord
      });

      return audit;
    });

    // Loggear auditoría (con PII enmascarada)
    console.log('📊 AUDITORÍA PERSISTIDA:', {
      auditId: result.id,
      docId: result.docId,
      estructura: result.estructura,
      templateMode: result.templateMode,
      force: result.force,
      contentHash: result.hashConcuerdo.substring(0, 16) + '...',
      timestamp: result.createdAt
    });

    return { success: true, auditId: result.id };

  } catch (error) {
    console.error('❌ Error registrando auditoría en BD:', error.message);

    // Fallback: loggear sin persistir si hay error de BD
    console.log('⚠️  Fallback: Auditoría no persistida, solo log:', {
      docId: auditData.docId,
      estructura: auditData.estructura,
      templateMode: auditData.templateMode,
      force: auditData.force,
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

/**
 * Consulta registros de auditoría (placeholder)
 * @param {Object} filters - Filtros de búsqueda
 */
export async function queryAuditLogs(filters = {}) {
  // TODO: Implementar consulta en base de datos
  // return await db.auditLogs.findMany({ where: filters });

  console.log('🔍 Consulta de auditoría (no implementada):', filters);
  return { success: false, message: 'Auditoría no implementada en BD' };
}

export default { logConcuerdoAudit, queryAuditLogs };