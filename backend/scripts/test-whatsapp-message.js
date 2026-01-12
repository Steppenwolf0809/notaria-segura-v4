/**
 * Script para probar la generación de mensajes WhatsApp con emojis
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Probando generación de mensaje WhatsApp\n');

    try {
        const template = await prisma.whatsAppTemplate.findFirst({
            where: { tipo: 'DOCUMENTO_LISTO', activo: true }
        });

        if (!template) {
            console.log('❌ No se encontró template DOCUMENTO_LISTO');
            return;
        }

        console.log('📋 Template encontrado:');
        console.log(`   ID: ${template.id}`);
        console.log(`   Título: ${template.titulo}`);
        console.log('');

        // Verificar bytes del mensaje para detectar problemas de codificación
        const msgBuffer = Buffer.from(template.mensaje, 'utf8');
        console.log(`📊 Tamaño del mensaje: ${msgBuffer.length} bytes`);
        console.log(`   Primeros 20 bytes: ${Array.from(msgBuffer.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        console.log('');

        // El emoji 🏛️ en UTF-8 es: F0 9F 8F 9B EF B8 8F
        // 🏛 (sin variation selector) es: F0 9F 8F 9B
        const hasEmoji = msgBuffer[0] === 0xF0 && msgBuffer[1] === 0x9F;
        console.log(`   ¿Empieza con emoji UTF-8?: ${hasEmoji ? '✅ Sí' : '❌ No'}`);

        // Simular reemplazo de variables
        let msg = template.mensaje
            .replace(/{nombreCompareciente}/g, 'María García Pérez')
            .replace(/{nombreNotariaCompleto}/g, 'NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO')
            .replace(/{documento}/g, 'Protocolo de Compraventa')
            .replace(/{codigo}/g, '1234')
            .replace(/{codigosEscritura}/g, '20251701018D00919');

        console.log('\n=== MENSAJE FORMATEADO ===\n');
        console.log(msg);

        console.log('\n=== URL WHATSAPP (primeros 300 chars) ===\n');
        const url = 'https://wa.me/593999999999?text=' + encodeURIComponent(msg);
        console.log(url.substring(0, 300));
        console.log('...');

        console.log('\n✅ Prueba completada');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
