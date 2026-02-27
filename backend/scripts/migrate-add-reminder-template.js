/**
 * Migracion: insertar plantilla RECORDATORIO_RETIRO
 * Ejecutar con: node scripts/migrate-add-reminder-template.js
 */
import { PrismaClient } from '@prisma/client';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL no esta configurada.');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

const RECORDATORIO_TEMPLATE = {
  tipo: 'RECORDATORIO_RETIRO',
  titulo: 'Recordatorio de Retiro de Documento',
  mensaje: `*{nombreNotariaCompleto}*\n\nEstimado/a {nombreCompareciente},\n\nRECORDATORIO: Su(s) documento(s) esta(n) listo(s) para retiro desde hace varios dias.\n\nDocumento: {documento}\nActo: {actoPrincipal}\nCodigo de retiro: {codigo}\n{codigosEscritura}\n\nLe recordamos que puede retirar su documentacion en nuestras oficinas.\n\nDireccion: Azuay E2-231 y Av Amazonas, Quito\nHorario: Lunes a Viernes 8:00-17:00\n\nPara consultas: {contactoConsultas}\nEsperamos su visita.`,
  activo: true
};

async function main() {
  console.log('Iniciando migracion: agregar plantilla RECORDATORIO_RETIRO...');

  const existing = await prisma.whatsAppTemplate.findFirst({
    where: { tipo: 'RECORDATORIO_RETIRO' }
  });

  if (existing) {
    console.log('Ya existe una plantilla RECORDATORIO_RETIRO.');
    console.log(`ID: ${existing.id}`);
    console.log(`Titulo: ${existing.titulo}`);

    if (process.argv.includes('--force')) {
      const updated = await prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data: {
          titulo: RECORDATORIO_TEMPLATE.titulo,
          mensaje: RECORDATORIO_TEMPLATE.mensaje,
          activo: RECORDATORIO_TEMPLATE.activo
        }
      });
      console.log(`Plantilla actualizada. ID: ${updated.id}`);
    } else {
      console.log('Use --force para actualizarla.');
    }

    return;
  }

  const created = await prisma.whatsAppTemplate.create({
    data: RECORDATORIO_TEMPLATE
  });

  console.log('Plantilla RECORDATORIO_RETIRO creada correctamente.');
  console.log(`ID: ${created.id}`);
}

main()
  .catch((error) => {
    console.error('Error en migracion:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });