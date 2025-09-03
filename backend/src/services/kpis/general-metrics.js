import { formatDateLocal, startOfDayLocal, endOfDayLocal } from '../../utils/timezone.js';

function mapEstado(clave) {
  if (clave === 'LISTO') return 'LISTO_ENTREGA';
  return clave;
}

export async function buildGeneralMetrics(prisma, from, to) {
  const start = startOfDayLocal(from);
  const end = endOfDayLocal(to);

  const [ingresadosHoy, procesadosHoy, entregadosHoy] = await Promise.all([
    prisma.document.count({ where: { createdAt: { gte: startOfDayLocal(new Date()), lte: endOfDayLocal(new Date()) } } }),
    prisma.document.count({ where: { status: 'LISTO', updatedAt: { gte: startOfDayLocal(new Date()), lte: endOfDayLocal(new Date()) } } }),
    prisma.document.count({ where: { fechaEntrega: { gte: startOfDayLocal(new Date()), lte: endOfDayLocal(new Date()) } } }),
  ]);

  // Estados agregados en la ventana
  const estadoAgg = await prisma.document.groupBy({
    by: ['status'],
    _count: { status: true },
    where: { createdAt: { gte: start, lte: end } },
  });
  const estados = ['PENDIENTE','EN_PROCESO','LISTO','ENTREGADO'].map((s) => ({
    clave: mapEstado(s),
    total: estadoAgg.find((e) => e.status === s)?._count?.status || 0,
  }));

  // Flujo diario: por día local, en rango
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(formatDateLocal(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  // Para simplicidad y rendimiento, consultas agregadas por día aproximadas
  const flujo_diario = [];
  for (const d of days) {
    const dStart = startOfDayLocal(new Date(d));
    const dEnd = endOfDayLocal(new Date(d));
    // Ingresados por createdAt
    // Procesados aproximado por updatedAt con status LISTO
    // Entregados por fechaEntrega
    /* eslint-disable no-await-in-loop */
    const [ing, proc, ent] = await Promise.all([
      prisma.document.count({ where: { createdAt: { gte: dStart, lte: dEnd } } }),
      prisma.document.count({ where: { status: 'LISTO', updatedAt: { gte: dStart, lte: dEnd } } }),
      prisma.document.count({ where: { fechaEntrega: { gte: dStart, lte: dEnd } } }),
    ]);
    flujo_diario.push({ fecha: d, ingresados: ing, procesados: proc, entregados: ent });
  }

  // Tiempo promedio de procesamiento (horas): updatedAt - createdAt para documentos que llegaron a LISTO
  const procesados = await prisma.document.findMany({
    where: { status: 'LISTO', createdAt: { gte: start, lte: end } },
    select: { createdAt: true, updatedAt: true },
    take: 1000,
  });
  let tProm = 0;
  if (procesados.length > 0) {
    const totalMs = procesados.reduce((acc, d) => acc + (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()), 0);
    tProm = +(totalMs / procesados.length / 3600000).toFixed(2);
  }

  return {
    resumen: {
      ingresados_hoy: ingresadosHoy,
      procesados_hoy: procesadosHoy,
      entregados_hoy: entregadosHoy,
      t_prom_procesamiento_horas: tProm,
    },
    estados,
    flujo_diario,
  };
}

export default { buildGeneralMetrics };

