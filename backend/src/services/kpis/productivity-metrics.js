import { startOfDayLocal, endOfDayLocal } from '../../utils/timezone.js';

export async function buildProductivityMetrics(prisma, from, to, opts = {}) {
  const limit = opts.limit || 10;
  const start = startOfDayLocal(from);
  const end = endOfDayLocal(to);

  // Ranking por matrizadores: documentos en LISTO en ventana (aprox.)
  const rankingRaw = await prisma.document.groupBy({
    by: ['assignedToId'],
    where: {
      status: 'LISTO',
      updatedAt: { gte: start, lte: end },
      assignedToId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
    take: limit,
  });

  const userIds = rankingRaw.map((r) => r.assignedToId).filter(Boolean);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true } }) : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  // Tiempo promedio por usuario (aprox.)
  const ranking_matrizadores = await Promise.all(rankingRaw.map(async (r) => {
    const docs = await prisma.document.findMany({
      where: { status: 'LISTO', updatedAt: { gte: start, lte: end }, assignedToId: r.assignedToId },
      select: { createdAt: true, updatedAt: true },
      take: 300,
    });
    let tProm = 0;
    if (docs.length) {
      const totalMs = docs.reduce((acc, d) => acc + (new Date(d.updatedAt).getTime() - new Date(d.createdAt).getTime()), 0);
      tProm = +(totalMs / docs.length / 3600000).toFixed(2);
    }
    const u = userMap.get(r.assignedToId);
    return {
      usuario_id: r.assignedToId,
      nombre: u ? `${u.firstName} ${u.lastName}` : 'Sin asignación',
      docs_procesados: r._count._all,
      t_prom_horas: tProm,
    };
  }));

  // Comparativas por área: estimación simple usando estados
  const comparativas_area = [
    { area: 'MATRIZACION', valor: ranking_matrizadores.reduce((a, b) => a + (b.docs_procesados || 0), 0) },
    { area: 'RECEPCION', valor: await prisma.document.count({ where: { fechaEntrega: { gte: start, lte: end } } }) },
    { area: 'ARCHIVO', valor: await prisma.document.count({ where: { status: 'ENTREGADO', updatedAt: { gte: start, lte: end } } }) },
  ];

  return { ranking_matrizadores, comparativas_area };
}

export default { buildProductivityMetrics };

