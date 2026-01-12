/**
 * Script para migrar templates a formato seguro (sin emojis en DB)
 * Reemplaza emojis hardcodeados con variables {emoji_X}
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SAFE_TEMPLATES = {
    DOCUMENTO_LISTO: {
        titulo: 'Documento Listo para Retiro',
        mensaje: `{emoji_notaria} *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

Su documento está listo para retiro:
{emoji_documento} *Documento:* {documento}
{emoji_codigo} *Código de retiro:* {codigo}
{emoji_escritura} *Código de escritura:* {codigosEscritura}

{emoji_importante} *IMPORTANTE:* Presente este código al momento del retiro.

{emoji_direccion} *Dirección:* Azuay E2-231 y Av Amazonas, Quito
{emoji_horario} *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Gracias por confiar en nosotros!`
    },
    RECORDATORIO_RETIRO: {
        titulo: 'Recordatorio de Retiro',
        mensaje: `{emoji_notaria} *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

{emoji_reloj} *RECORDATORIO:* Su(s) documento(s) está(n) listo(s) para retiro desde hace varios días.

{emoji_documento} *Documento:* {documento}
{emoji_codigo} *Código de retiro:* {codigo}
{emoji_escritura} *Código de escritura:* {codigosEscritura}

{emoji_importante} Le recordamos que puede retirar su documentación en nuestras oficinas.

{emoji_direccion} *Dirección:* Azuay E2-231 y Av Amazonas, Quito
{emoji_horario} *Horario:* Lunes a Viernes 8:00-17:00

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Esperamos su visita!`
    },
    DOCUMENTO_ENTREGADO: {
        titulo: 'Confirmación de Entrega',
        mensaje: `{emoji_notaria} *NOTARÍA DÉCIMO OCTAVA DEL CANTÓN QUITO*

Estimado/a {nombreCompareciente},

✅ Confirmamos la entrega de su documento:
{emoji_documento} *Documento:* {documento}
👤 *Retirado por:* {nombreRetirador}
{seccionCedula}
📅 *Fecha:* {fechaFormateada}

Para consultas: Tel: (02) 2234-567 | email@notaria18.gob.ec
¡Gracias por confiar en nuestros servicios!`
    }
};

async function main() {
    console.log('🛡️ Migrando templates a formato seguro (variables de emojis)...\n');

    for (const [tipo, data] of Object.entries(SAFE_TEMPLATES)) {
        try {
            // Buscar template existente
            const existing = await prisma.whatsAppTemplate.findFirst({
                where: { tipo }
            });

            if (existing) {
                // Actualizar
                await prisma.whatsAppTemplate.update({
                    where: { id: existing.id },
                    data: {
                        mensaje: data.mensaje
                    }
                });
                console.log(`✅ Template ${tipo} actualizado a formato seguro`);
            } else {
                // Crear
                await prisma.whatsAppTemplate.create({
                    data: {
                        tipo,
                        titulo: data.titulo,
                        mensaje: data.mensaje,
                        activo: true
                    }
                });
                console.log(`✅ Template ${tipo} creado en formato seguro`);
            }
        } catch (error) {
            console.error(`❌ Error procesando ${tipo}:`, error.message);
        }
    }

    console.log('\n✅ Migración completada');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
