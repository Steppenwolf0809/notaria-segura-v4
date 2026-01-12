/**
 * Migración: Insertar plantilla de RECORDATORIO_RETIRO
 * Ejecutar con: node scripts/migrate-add-reminder-template.js
 */
import { PrismaClient } from '@prisma/client';

// URL de BD temporal para migración (eliminar después)
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL || 'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway'
        }
    }
});

const RECORDATORIO_TEMPLATE = {
    tipo: 'RECORDATORIO_RETIRO',
    titulo: 'Recordatorio de Retiro de Documento',
    mensaje: `🏛️ *{nombreNotariaCompleto}*

Estimado/a {nombreCompareciente},

⏰ *RECORDATORIO:* Su(s) documento(s) está(n) listo(s) para retiro desde hace varios días.

📄 *Documento:* {documento}
📝 *Acto:* {actoPrincipal}
🔢 *Código de retiro:* {codigo}
{codigosEscritura}

⚠️ Le recordamos que puede retirar su documentación en nuestras oficinas.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: {contactoConsultas}
¡Esperamos su visita!`,
    activo: true
};

async function main() {
    console.log('🚀 Iniciando migración: Agregar plantilla RECORDATORIO_RETIRO...\n');

    // Verificar si ya existe
    const existing = await prisma.whatsAppTemplate.findFirst({
        where: { tipo: 'RECORDATORIO_RETIRO' }
    });

    if (existing) {
        console.log('⚠️  Ya existe una plantilla RECORDATORIO_RETIRO en la BD.');
        console.log(`   ID: ${existing.id}`);
        console.log(`   Título: ${existing.titulo}`);
        console.log('\n¿Desea actualizarla? Ejecute con --force para sobrescribir.');

        if (process.argv.includes('--force')) {
            const updated = await prisma.whatsAppTemplate.update({
                where: { id: existing.id },
                data: {
                    titulo: RECORDATORIO_TEMPLATE.titulo,
                    mensaje: RECORDATORIO_TEMPLATE.mensaje,
                    activo: RECORDATORIO_TEMPLATE.activo
                }
            });
            console.log('\n✅ Plantilla actualizada exitosamente.');
            console.log(`   ID: ${updated.id}`);
        }
        return;
    }

    // Crear nueva plantilla
    const created = await prisma.whatsAppTemplate.create({
        data: RECORDATORIO_TEMPLATE
    });

    console.log('✅ Plantilla RECORDATORIO_RETIRO creada exitosamente!');
    console.log(`   ID: ${created.id}`);
    console.log(`   Tipo: ${created.tipo}`);
    console.log(`   Título: ${created.titulo}`);
    console.log(`   Activo: ${created.activo}`);
}

main()
    .catch((e) => {
        console.error('❌ Error en migración:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
