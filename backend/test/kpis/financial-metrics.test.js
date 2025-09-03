import { buildFinancialMetrics } from '../../src/services/kpis/financial-metrics.js';

function makePrismaMock(docs) {
  return {
    document: {
      findMany: async ({ where }) => {
        // naive filter for createdAt window
        const gte = where?.createdAt?.gte;
        const lte = where?.createdAt?.lte;
        return docs.filter(d => {
          return (!gte || d.createdAt >= gte) && (!lte || d.createdAt <= lte);
        });
      },
    },
  };
}

describe('KPIs Financieros', () => {
  it('calcula totales, notas de crédito y serie diaria respetando TZ', async () => {
    const base = new Date('2025-01-10T12:00:00Z');
    const docs = [
      { id: '1', createdAt: new Date('2025-01-10T01:00:00Z'), totalFactura: 100, documentType: 'ACTA', notaCreditoFecha: null },
      { id: '2', createdAt: new Date('2025-01-10T03:00:00Z'), totalFactura: 50, documentType: 'ESCRITURA', notaCreditoFecha: new Date('2025-01-11T12:00:00Z') },
      { id: '3', createdAt: new Date('2025-01-11T15:00:00Z'), totalFactura: 150, documentType: null, notaCreditoFecha: null },
    ];
    const prisma = makePrismaMock(docs);

    const from = new Date('2025-01-10');
    const to = new Date('2025-01-12');
    const result = await buildFinancialMetrics(prisma, from, to, 'day');

    expect(result.totales.total_facturado).toBe(250); // 100 + 150 (exclude NC)
    expect(result.totales.total_nc).toBe(50); // NC resta
    expect(result.totales.neto).toBe(200);
    // Debe mapear SIN_CLASIFICAR si documentType es null
    const keys = result.por_tipo.map(x => x.clave);
    expect(keys).toContain('SIN_CLASIFICAR');
    // Serie incluye días solicitados
    expect(Array.isArray(result.serie)).toBe(true);
    expect(result.fuente).toBe('FACTURACION_AUTORIZADA');
  });
});
