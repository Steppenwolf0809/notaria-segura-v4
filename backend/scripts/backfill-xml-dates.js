// Backfill de createdAt desde la fecha del XML (infoFactura.fechaEmision)
// Uso: node scripts/backfill-xml-dates.js [--dry-run] [--limit=1000]
// Variables opcionales: BACKFILL_BATCH_SIZE, BACKFILL_LIMIT, BACKFILL_DRY_RUN=true|false

import 'dotenv/config';
import prisma from '../src/db.js';
import { parseXmlDocument } from '../src/services/xml-parser-service.js';

const arg = (name, defVal) => {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  if (found) return found.split('=')[1];
  return defVal;
};

const DRY_RUN = (process.env.BACKFILL_DRY_RUN || arg('dry-run', '')).toString().toLowerCase() === 'true';
const BATCH_SIZE = parseInt(process.env.BACKFILL_BATCH_SIZE || '200', 10);
const LIMIT = parseInt(process.env.BACKFILL_LIMIT || arg('limit', '0'), 10); // 0 = sin límite

function sameDayUTC(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth() === b.getUTCMonth() &&
         a.getUTCDate() === b.getUTCDate();
}

async function backfill() {
  console.log('🔧 Iniciando backfill de fechas desde XML');
  console.log(`⚙️  Opciones: DRY_RUN=${DRY_RUN} BATCH_SIZE=${BATCH_SIZE} LIMIT=${LIMIT || 'sin límite'}`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let cursor = undefined;

  while (true) {
    const take = Math.min(BATCH_SIZE, LIMIT > 0 ? Math.max(0, LIMIT - totalProcessed) : BATCH_SIZE);
    if (LIMIT > 0 && take === 0) break;

    const docs = await prisma.document.findMany({
      where: { xmlOriginal: { not: null } },
      select: { id: true, protocolNumber: true, createdAt: true, xmlOriginal: true },
      orderBy: { id: 'asc' },
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      take
    });

    if (docs.length === 0) break;

    for (const d of docs) {
      totalProcessed++;
      cursor = d.id;
      try {
        const parsed = await parseXmlDocument(d.xmlOriginal);
        const xmlDate = parsed.xmlDate instanceof Date ? parsed.xmlDate : new Date(parsed.xmlDate);
        if (isNaN(xmlDate.getTime())) {
          console.warn(`⚠️  Documento ${d.id} (${d.protocolNumber}): xmlDate inválida, se omite`);
          continue;
        }

        if (sameDayUTC(d.createdAt, xmlDate)) {
          // Ya coincide por día; no tocar
          continue;
        }

        if (DRY_RUN) {
          console.log(`→ DRY_RUN actualizaría ${d.id} (${d.protocolNumber}) createdAt: ${d.createdAt.toISOString()} -> ${xmlDate.toISOString()}`);
        } else {
          await prisma.document.update({ where: { id: d.id }, data: { createdAt: xmlDate } });
          totalUpdated++;
          console.log(`✅ Actualizado ${d.id} (${d.protocolNumber}) -> ${xmlDate.toISOString()}`);
        }
      } catch (e) {
        console.warn(`❌ Error procesando ${d.id} (${d.protocolNumber}): ${e?.message || e}`);
      }

      if (LIMIT > 0 && totalProcessed >= LIMIT) break;
    }

    if (docs.length < take) break; // no hay más
    if (LIMIT > 0 && totalProcessed >= LIMIT) break;
  }

  console.log(`\n📊 Backfill completado. Procesados: ${totalProcessed}, Actualizados: ${totalUpdated}, DRY_RUN=${DRY_RUN}`);
}

backfill()
  .catch(err => {
    console.error('Error en backfill:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await prisma.$disconnect(); } catch {}
  });

