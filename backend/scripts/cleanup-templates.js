/**
 * Script para limpiar templates duplicados y corregir emojis
 * Ejecutar con: node scripts/cleanup-templates.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Templates definitivos con emojis correctos
const TEMPLATES_DEFINITIVOS = {
    DOCUMENTO_LISTO: {
        titulo: 'Documento Listo para Retiro',
        mensaje: `🏛️ *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

Su documento está listo para retiro:
📄 *Documento:* {documento}
🔢 *Código de retiro:* {codigo}
📋 *Código de escritura:* {codigosEscritura}

⚠️ *IMPORTANTE:* Presente este código al momento del retiro.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Gracias por confiar en nosotros!`
    },
    RECORDATORIO_RETIRO: {
        titulo: 'Recordatorio de Retiro',
        mensaje: `🏛️ *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

⏰ *RECORDATORIO:* Su(s) documento(s) está(n) listo(s) para retiro desde hace varios días.

📄 *Documento:* {documento}
🔢 *Código de retiro:* {codigo}
📋 *Código de escritura:* {codigosEscritura}

⚠️ Le recordamos que puede retirar su documentación en nuestras oficinas.

📍 *Dirección:* Azuay E2-231 y Av Amazonas, Quito
⏰ *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Esperamos su visita!`
    },
    DOCUMENTO_ENTREGADO: {
        titulo: 'Confirmación de Entrega',
        mensaje: `🏛️ *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

✅ Confirmamos la entrega de su documento:
📄 *Documento:* {documento}
👤 *Retirado por:* {nombreRetirador}
{seccionCedula}
📅 *Fecha:* {fechaFormateada}

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Gracias por confiar en nuestros servicios!`
    }
};

async function main() {
    console.log('🧹 Limpiando y corrigiendo templates WhatsApp\n');

    try {
        // 1. Obtener todos los templates actuales
        const templates = await prisma.whatsAppTemplate.findMany();
        console.log(`📊 Templates encontrados: ${templates.length}\n`);

        for (const t of templates) {
            console.log(`  - ID: ${t.id.substring(0, 8)}... | Tipo: ${t.tipo} | Título: ${t.titulo}`);
        }

        // 2. Eliminar TODOS los templates existentes
        console.log('\n🗑️ Eliminando templates existentes...');
        const deleted = await prisma.whatsAppTemplate.deleteMany({});
        console.log(`   Eliminados: ${deleted.count} templates\n`);

        // 3. Crear templates nuevos con emojis correctos
        console.log('✨ Creando templates definitivos con emojis...\n');

        for (const [tipo, data] of Object.entries(TEMPLATES_DEFINITIVOS)) {
            const template = await prisma.whatsAppTemplate.create({
                data: {
                    tipo,
                    titulo: data.titulo,
                    mensaje: data.mensaje,
                    activo: true
                }
            });
            console.log(`   ✅ ${tipo}: ${template.id}`);
        }

        // 4. Verificar resultado
        console.log('\n📋 Verificación final:');
        const nuevosTemplates = await prisma.whatsAppTemplate.findMany();

        for (const t of nuevosTemplates) {
            const tieneEmoji = t.mensaje.includes('🏛️');
            console.log(`   ${tieneEmoji ? '✅' : '❌'} ${t.tipo}: ${t.titulo}`);
            console.log(`      Preview: ${t.mensaje.substring(0, 60).replace(/\n/g, ' ')}...`);
        }

        console.log('\n✅ Proceso completado exitosamente');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
