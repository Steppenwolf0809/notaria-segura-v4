/**
 * Script para probar la generación de mensajes WhatsApp con Emojis Seguros
 */
import { PrismaClient } from '@prisma/client';
import { EMOJIS } from '../src/utils/emojis.js';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Probando generación de mensaje Seguro con Unicode Escapes\n');

    try {
        const template = await prisma.whatsAppTemplate.findFirst({
            where: { tipo: 'DOCUMENTO_LISTO', activo: true }
        });

        if (!template) {
            console.log('❌ No se encontró template DOCUMENTO_LISTO');
            return;
        }

        console.log('📋 Template encontrado (formato variables seguras?):');
        console.log(template.mensaje.substring(0, 100));

        // Simular reemplazo de variables usando las constantes EMOJIS
        // Esto replica lo que hace document-controller.js
        let msg = template.mensaje
            .replace(/{nombreCompareciente}/g, 'Prueba Segura')
            .replace(/{nombreNotariaCompleto}/g, 'NOTARÍA DÉCIMO OCTAVA')
            // Reemplazo de emojis seguros
            .replace(/\{emoji_notaria\}/g, EMOJIS.NOTARIA)
            .replace(/\{emoji_documento\}/g, EMOJIS.DOCUMENTO)
            .replace(/\{emoji_codigo\}/g, EMOJIS.CODIGO)
            .replace(/\{emoji_escritura\}/g, EMOJIS.ESCRITURA)
            .replace(/\{emoji_importante\}/g, EMOJIS.IMPORTANTE)
            .replace(/\{emoji_direccion\}/g, EMOJIS.DIRECCION)
            .replace(/\{emoji_horario\}/g, EMOJIS.HORARIO)
            .replace(/\{emoji_reloj\}/g, EMOJIS.RELOJ);

        console.log('\n=== MENSAJE FORMATEADO ===\n');
        console.log(msg);

        console.log('\n=== URL WHATSAPP (comprobación de encoding) ===\n');
        const url = 'https://wa.me/593999999999?text=' + encodeURIComponent(msg);
        console.log(url.substring(0, 300));

        // Verificar que no contenga el replacement character
        if (url.includes('%EF%BF%BD')) {
            console.log('\n❌ FALLO: La URL contiene el carácter de reemplazo (corruption detected!)');
        } else {
            console.log('\n✅ ÉXITO: La URL NO contiene caracteres corruptos');
        }

        // Verificar presencia del emoji Notaria (🏛️ = %F0%9F%8F%9B%EF%B8%8F)
        if (url.includes('%F0%9F%8F%9B')) {
            console.log('✅ ÉXITO: Emoji Notaria detectado correctamente');
        } else {
            console.log('❌ FALLO: Emoji Notaria NO detectado');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
