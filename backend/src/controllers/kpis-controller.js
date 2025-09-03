import prisma from '../db.js';
import cache from '../services/cache-service.js';
import { startOfDayLocal, endOfDayLocal, formatDateLocal } from '../utils/timezone.js';
import { buildGeneralMetrics } from '../services/kpis/general-metrics.js';
import { buildProductivityMetrics } from '../services/kpis/productivity-metrics.js';
import { buildFinancialMetrics } from '../services/kpis/financial-metrics.js';
import { generateAlerts } from '../services/kpis/alerts-generator.js';

function parseDateParam(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function getGeneralKpis(req, res) {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Parámetros from/to inválidos (YYYY-MM-DD)' });
    }

    const key = `kpis:general:${formatDateLocal(from)}:${formatDateLocal(to)}`;
    const data = await cache.wrap(key, async () => {
      const [general, alerts, finResumen] = await Promise.all([
        buildGeneralMetrics(prisma, from, to),
        generateAlerts(prisma, { limit: 50 }),
        buildFinancialMetrics(prisma, from, to, 'day', { summaryOnly: true }),
      ]);

      return {
        resumen: general.resumen,
        estados: general.estados,
        flujo_diario: general.flujo_diario,
        alertas: alerts,
        finanzas_resumen: {
          total_facturado_hoy: finResumen?.hoy || 0,
          total_facturado_semana: finResumen?.semana || 0,
          total_facturado_mes: finResumen?.mes || 0,
          fuente: 'FACTURACION_AUTORIZADA',
        },
      };
    }, { ttlMs: 300000, tags: ['kpis', 'kpis:general'] });

    res.json({ success: true, data, message: 'Operación completada' });
  } catch (e) {
    console.error('KPIs general error:', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
}

export async function getProductivityKpis(req, res) {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Parámetros from/to inválidos (YYYY-MM-DD)' });
    }

    const key = `kpis:productivity:${formatDateLocal(from)}:${formatDateLocal(to)}:${limit}`;
    const data = await cache.wrap(key, async () => {
      return buildProductivityMetrics(prisma, from, to, { limit });
    }, { ttlMs: 420000, tags: ['kpis', 'kpis:productivity'] });

    res.json({ success: true, data, message: 'Operación completada' });
  } catch (e) {
    console.error('KPIs productivity error:', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
}

export async function getFinancialKpis(req, res) {
  try {
    const from = parseDateParam(req.query.from);
    const to = parseDateParam(req.query.to);
    const granularity = ['day','week','month'].includes(req.query.granularity) ? req.query.granularity : 'day';
    if (!from || !to) {
      return res.status(400).json({ success: false, error: 'Parámetros from/to inválidos (YYYY-MM-DD)' });
    }

    const key = `kpis:financial:${formatDateLocal(from)}:${formatDateLocal(to)}:${granularity}`;
    const data = await cache.wrap(key, async () => {
      return buildFinancialMetrics(prisma, from, to, granularity);
    }, { ttlMs: 540000, tags: ['kpis', 'kpis:financial'] });

    res.json({ success: true, data, message: 'Operación completada' });
  } catch (e) {
    console.error('KPIs financial error:', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
}

export async function getAlertsKpis(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
    const key = `kpis:alerts:${limit}`;
    const data = await cache.wrap(key, async () => {
      return generateAlerts(prisma, { limit });
    }, { ttlMs: 300000, tags: ['kpis', 'kpis:alerts'] });
    res.json({ success: true, data, message: 'Operación completada' });
  } catch (e) {
    console.error('KPIs alerts error:', e);
    res.status(500).json({ success: false, error: 'Error interno' });
  }
}

export default {
  getGeneralKpis,
  getProductivityKpis,
  getFinancialKpis,
  getAlertsKpis,
};

