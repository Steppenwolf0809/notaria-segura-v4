
import { sincronizarCompletitudProtocolo } from '../src/services/completitud-service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixStaleStatus() {
    try {
        console.log('Sincronizando completitud para el protocolo problematico...');

        // Buscamos el ID interno del protocolo '2026p12'
        const protocolo = await prisma.protocoloUAFE.findFirst({
            where: {
                OR: [
                    { numeroProtocolo: '2026p12' },
                    { identificadorTemporal: '2026p12' }
                ]
            }
        });

        if (!protocolo) {
            console.log('No se encontró el protocolo 2026p12');
            return;
        }

        console.log(`Protocolo encontrado: ${protocolo.id}. Iniciando sincronización...`);

        const resultado = await sincronizarCompletitudProtocolo(protocolo.id);

        console.log('--- RESULTADO ---');
        console.log(JSON.stringify(resultado, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixStaleStatus();
