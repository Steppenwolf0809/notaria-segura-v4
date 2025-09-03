import { startOfDayLocal, endOfDayLocal } from '../../utils/timezone.js';

export async function generateAlerts(prisma, { limit = 100 } = {}) {
  // Heurísticas básicas: documentos viejos sin procesar/entregar y códigos potencialmente vencidos
  const now = new Date();
  const twoDaysAgo = new Date(now); twoDaysAgo.setDate(now.getDate() - 2);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(now.getDate() - 3);

  const [pendientes, enProceso, listos, errores] = await Promise.all([
    prisma.document.findMany({ where: { status: 'PENDIENTE', createdAt: { lt: twoDaysAgo } }, select: { id: true, clientName: true, createdAt: true }, take: Math.ceil(limit/3) }),
    prisma.document.findMany({ where: { status: 'EN_PROCESO', createdAt: { lt: sevenDaysAgo } }, select: { id: true, clientName: true, createdAt: true }, take: Math.ceil(limit/3) }),
    prisma.document.findMany({ where: { status: 'LISTO', createdAt: { lt: threeDaysAgo } }, select: { id: true, clientName: true, createdAt: true }, take: Math.ceil(limit/4) }),
    prisma.whatsAppNotification.findMany({ where: { status: 'FAILED' }, select: { id: true, createdAt: true, messageType: true }, take: Math.ceil(limit/4) }),
  ]);

  const arr = [];
  let id = 1;

  for (const d of pendientes) {
    arr.push({ id: `A-${id++}`, tipo: '>X_dias_sin_procesar', severidad: 'WARN', documento_id: d.id, detalle: `Pendiente >2 días: ${d.clientName || ''}` , creado_at: d.createdAt });
  }
  for (const d of enProceso) {
    arr.push({ id: `A-${id++}`, tipo: 'urgente_vencido', severidad: 'CRITICAL', documento_id: d.id, detalle: `En proceso >7 días: ${d.clientName || ''}` , creado_at: d.createdAt });
  }
  for (const d of listos) {
    arr.push({ id: `A-${id++}`, tipo: 'codigo_expirado', severidad: 'INFO', documento_id: d.id, detalle: `Listo sin entrega >3 días`, creado_at: d.createdAt });
  }
  for (const n of errores) {
    arr.push({ id: `A-${id++}`, tipo: 'error_sistema', severidad: 'WARN', detalle: `WhatsApp fallido (${n.messageType})`, creado_at: n.createdAt });
  }

  // Recortar al límite solicitado
  return arr.slice(0, limit);
}

export default { generateAlerts };

