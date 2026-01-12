/**
 * Script para corregir la duplicación de etiquetas en los templates
 * Elimina "{emoji_escritura} *Código de escritura:*" ya que la variable {codigosEscritura} ya lo incluye
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Corrigiendo duplicación en templates...\n');

    const templates = await prisma.whatsAppTemplate.findMany({
        where: { activo: true }
    });

    for (const t of templates) {
        // Si contiene la duplicación potencial
        if (t.mensaje.includes('{emoji_escritura} *Código de escritura:* {codigosEscritura}')) {
            console.log(`Corrigiendo template: ${t.tipo}`);

            const newMsg = t.mensaje.replace(
                '{emoji_escritura} *Código de escritura:* {codigosEscritura}',
                '{codigosEscritura}'
            );

            await prisma.whatsAppTemplate.update({
                where: { id: t.id },
                data: { mensaje: newMsg }
            });
            console.log('✅ Corregido');
        } else {
            // También revisar si tiene solo el label sin emoji variable pero con emoji hardcoded (caso anterior)
            // O si tiene la versión segura duplicada
            console.log(`Template ${t.tipo} no requiere corrección o ya estaba bien.`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
