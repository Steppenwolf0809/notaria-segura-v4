import dotenv from 'dotenv';
dotenv.config({ path: './.env' });
import prisma from '../src/db.js';

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

const FIRST_NAMES = [
  'MARIA','JUAN','PEDRO','ANA','CARLOS','LUISA','MARIO','SOFIA','ANDRES','ROSA',
  'MARTA','JOSE','PABLO','LAURA','DIEGO','PAULA','EMILIA','MATEO','VALERIA','RICARDO'
];
const LAST_NAMES = ['GOMEZ','PEREZ','SANCHEZ','MORA','ALVARADO','GARCIA','MORALES','FERNANDEZ','TORRES','LOPEZ'];
const DOC_TYPES = ['PROTOCOLO','DILIGENCIA','CERTIFICACION','ARRENDAMIENTO','OTROS'];

function randomName() {
  const fn = FIRST_NAMES[randInt(0, FIRST_NAMES.length - 1)];
  const ln = LAST_NAMES[randInt(0, LAST_NAMES.length - 1)];
  return `${fn} ${ln}`;
}

function randomProtocol() {
  return `P-${randInt(10000000, 99999999)}`;
}

async function ensureUsers() {
  // Ensure a CAJA user exists for createdById
  let caja = await prisma.user.findFirst({ where: { role: 'CAJA', email: 'caja+seed@notaria.local' } });
  if (!caja) {
    caja = await prisma.user.create({ data: {
      email: 'caja+seed@notaria.local', password: 'hashed', firstName: 'Caja', lastName: 'Seed', role: 'CAJA'
    }});
  }
  // Optional RECEPCION for deliveredBy
  let recep = await prisma.user.findFirst({ where: { role: 'RECEPCION', email: 'recepcion+seed@notaria.local' } });
  if (!recep) {
    recep = await prisma.user.create({ data: {
      email: 'recepcion+seed@notaria.local', password: 'hashed', firstName: 'Recepcion', lastName: 'Seed', role: 'RECEPCION'
    }});
  }
  return { caja, recep };
}

async function createDocs(count, status, opts = {}) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    const clientName = randomName();
    const protocolNumber = randomProtocol();
    const documentType = DOC_TYPES[randInt(0, DOC_TYPES.length - 1)];
    const data = {
      protocolNumber,
      clientName,
      clientPhone: `09${randInt(10000000, 99999999)}`,
      documentType,
      status,
      createdById: opts.createdById,
      actoPrincipalDescripcion: `Acto principal para ${clientName}`,
      actoPrincipalValor: randInt(10, 200) * 10,
      totalFactura: randInt(20, 300) * 10,
      matrizadorName: 'MATRIZADOR AUTO',
    };
    if (status !== 'PENDIENTE') {
      data.verificationCode = `${randInt(1000, 9999)}`;
    }
    if (status === 'ENTREGADO') {
      data.fechaEntrega = new Date();
      data.usuarioEntregaId = opts.recepcionId;
      data.entregadoA = randomName();
      data.relacionTitular = 'tercero';
    }
    docs.push(data);
  }
  // Create many in chunks to avoid oversized payload
  const chunk = 50;
  for (let i = 0; i < docs.length; i += chunk) {
    await prisma.document.createMany({ data: docs.slice(i, i + chunk), skipDuplicates: true });
  }
}

async function main() {
  console.log('Seeding v1.2 documents...');
  const { caja, recep } = await ensureUsers();
  await createDocs(60, 'EN_PROCESO', { createdById: caja.id });
  await createDocs(20, 'LISTO', { createdById: caja.id });
  await createDocs(40, 'ENTREGADO', { createdById: caja.id, recepcionId: recep.id });
  const total = await prisma.document.count();
  console.log(`Seed completed. Total documents: ${total}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

