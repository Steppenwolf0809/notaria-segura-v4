
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInconsistency() {
    try {
        console.log("Buscando 'Zapata Silva'...");

        // Buscar cédula por nombre (aproximado, asumiendo que es la cedula de la imagen '0603123340')
        const cedula = '0603123340';

        // 1. Ver datos maestros
        const persona = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: cedula }
        });

        if (!persona) {
            console.log('Persona no encontrada en maestros.');
            return;
        }

        console.log(`Persona: ${persona.datosPersonaNatural.datosPersonales.nombres} ${persona.datosPersonaNatural.datosPersonales.apellidos}`);

        // 2. Ver todas las participaciones en protocolos
        const participaciones = await prisma.personaProtocolo.findMany({
            where: { personaCedula: cedula },
            include: {
                protocolo: {
                    select: {
                        numeroProtocolo: true,
                        identificadorTemporal: true
                    }
                }
            }
        });

        console.log('\n--- PARTICIPACIONES Y ESTADOS ---');
        participaciones.forEach(p => {
            console.log(`Protocolo: ${p.protocolo.numeroProtocolo || p.protocolo.identificadorTemporal}`);
            console.log(`  Estado Guardado: ${p.estadoCompletitud}`);
            console.log(`  Porcentaje: ${p.porcentajeCompletitud}%`);
            console.log(`  Campos Faltantes: ${JSON.stringify(p.camposFaltantes)}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkInconsistency();
