import { formatDateLocal, startOfDayLocal, endOfDayLocal } from '../../utils/timezone.js';

function rangeDates(from, to, granularity = 'day') {
  const out = [];
  const c = new Date(startOfDayLocal(from));
  const end = endOfDayLocal(to);
  while (c <= end) {
    out.push(new Date(c));
    if (granularity === 'month') c.setMonth(c.getMonth() + 1, 1);
    else if (granularity === 'week') c.setDate(c.getDate() + 7);
    else c.setDate(c.getDate() + 1);
  }
  return out;
}

function classifyTipo(doc) {
  // Clasificar por tipo de documento si existe, fallback SIN_CLASIFICAR
  return doc?.documentType || 'SIN_CLASIFICAR';
}

export async function buildFinancialMetrics(prisma, from, to, granularity = 'day', opts = {}) {
  const start = startOfDayLocal(from);
  const end = endOfDayLocal(to);

  // “Pagado ≡ Facturado (AUTORIZADA)”: asumimos totalFactura como facturación autorizada
  // Notas de crédito restan: usamos notaCreditoFecha para detectar

  const facturas = await prisma.document.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { id: true, createdAt: true, totalFactura: true, documentType: true, notaCreditoFecha: true },
  });

  const notasCredito = facturas.filter(d => !!d.notaCreditoFecha);
  const facturasVigentes = facturas.filter(d => !d.notaCreditoFecha);

  const total_facturado = +(facturasVigentes.reduce((a, b) => a + (b.totalFactura || 0), 0).toFixed(2));
  const total_nc = +(notasCredito.reduce((a, b) => a + (b.totalFactura || 0), 0).toFixed(2));
  const neto = +(total_facturado - total_nc).toFixed(2);

  const por_tipo_map = new Map();
  for (const d of facturasVigentes) {
    const k = classifyTipo(d);
    por_tipo_map.set(k, (por_tipo_map.get(k) || 0) + (d.totalFactura || 0));
  }
  const por_tipo_arr = Array.from(por_tipo_map.entries()).map(([clave, total]) => ({ clave, total: +total.toFixed(2) }));

  const buckets = rangeDates(start, end, granularity);
  const serie = buckets.map(b => {
    const bStart = startOfDayLocal(b);
    const bEnd = endOfDayLocal(b);
    const total = facturasVigentes
      .filter(d => d.createdAt >= bStart && d.createdAt <= bEnd)
      .reduce((a, b) => a + (b.totalFactura || 0), 0);
    return { fecha: formatDateLocal(b), total: +total.toFixed(2) };
  });

  const notas_credito = buckets.map(b => {
    const bStart = startOfDayLocal(b);
    const bEnd = endOfDayLocal(b);
    const total = notasCredito
      .filter(d => d.notaCreditoFecha && d.notaCreditoFecha >= bStart && d.notaCreditoFecha <= bEnd)
      .reduce((a, b) => a + (b.totalFactura || 0), 0);
    return { fecha: formatDateLocal(b), total: +total.toFixed(2) };
  });

  if (opts.summaryOnly) {
    // Totales rápidos para General
    const hoyStr = formatDateLocal(new Date());
    const semana = serie.slice(-7).reduce((a, b) => a + b.total, 0);
    const mes = serie.slice(-30).reduce((a, b) => a + b.total, 0);
    const hoy = (serie.find(s => s.fecha === hoyStr)?.total) || 0;
    return { hoy, semana: +semana.toFixed(2), mes: +mes.toFixed(2) };
  }

  return {
    totales: { total_facturado, total_nc, neto },
    por_tipo: por_tipo_arr,
    serie,
    notas_credito,
    fuente: 'FACTURACION_AUTORIZADA',
  };
}

export default { buildFinancialMetrics };

