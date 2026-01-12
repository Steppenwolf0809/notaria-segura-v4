/**
 * Script para verificar y corregir emojis en templates de WhatsApp
 * Ejecutar con: node scripts/fix-whatsapp-emojis.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Templates con emojis correctos
const TEMPLATES_CORRECTOS = {
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

async function verificarTemplates() {
    console.log('🔍 Verificando templates en la base de datos...\n');

    const templates = await prisma.whatsAppTemplate.findMany();

    if (templates.length === 0) {
        console.log('⚠️ No hay templates en la base de datos. Creando templates por defecto...\n');
        return false;
    }

    for (const template of templates) {
        console.log('═'.repeat(60));
        console.log(`📋 Tipo: ${template.tipo}`);
        console.log(`📝 Título: ${template.titulo}`);
        console.log(`✅ Activo: ${template.activo}`);

        // Verificar si tiene emojis
        const tieneEmoji = template.mensaje.includes('🏛️') ||
            template.mensaje.includes('📄') ||
            template.mensaje.includes('🔢');

        console.log(`🎨 Tiene emojis: ${tieneEmoji ? '✅ Sí' : '❌ No'}`);
        console.log(`📜 Preview (primeros 150 chars):`);
        console.log(`   ${template.mensaje.substring(0, 150).replace(/\n/g, ' ')}`);
        console.log('');
    }

    return templates.some(t =>
        !t.mensaje.includes('🏛️') &&
        !t.mensaje.includes('📄')
    );
}

async function corregirTemplates() {
    console.log('\n🔧 Corrigiendo templates con emojis...\n');

    for (const [tipo, data] of Object.entries(TEMPLATES_CORRECTOS)) {
        try {
            // Buscar template existente
            const existing = await prisma.whatsAppTemplate.findFirst({
                where: { tipo }
            });

            if (existing) {
                // Actualizar el mensaje con emojis correctos
                await prisma.whatsAppTemplate.update({
                    where: { id: existing.id },
                    data: {
                        titulo: data.titulo,
                        mensaje: data.mensaje
                    }
                });
                console.log(`✅ Template ${tipo} actualizado con emojis`);
            } else {
                // Crear nuevo template
                await prisma.whatsAppTemplate.create({
                    data: {
                        tipo,
                        titulo: data.titulo,
                        mensaje: data.mensaje,
                        activo: true
                    }
                });
                console.log(`✅ Template ${tipo} creado con emojis`);
            }
        } catch (error) {
            console.error(`❌ Error procesando template ${tipo}:`, error.message);
        }
    }
}

async function main() {
    console.log('🚀 Script de corrección de emojis en templates WhatsApp\n');
    console.log('📊 DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...\n');

    try {
        const necesitaCorreccion = await verificarTemplates();

        if (necesitaCorreccion) {
            console.log('\n⚠️ Se detectaron templates sin emojis. Corrigiendo...');
            await corregirTemplates();
        } else {
            console.log('\n🤔 Los templates parecen tener emojis. ¿Desea forzar la actualización?');
            console.log('   Ejecute con --force para actualizar de todos modos\n');

            if (process.argv.includes('--force')) {
                await corregirTemplates();
            }
        }

        console.log('\n✅ Proceso completado');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
