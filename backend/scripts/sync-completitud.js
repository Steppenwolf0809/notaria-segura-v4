/**
 * Script para sincronizar la completitud de participantes en un protocolo
 * 
 * Uso: node scripts/sync-completitud.js [protocoloNumero]
 * Ejemplo: node scripts/sync-completitud.js 20261
 */

import { PrismaClient } from '@prisma/client';
import { sincronizarCompletitudProtocolo } from '../src/services/completitud-service.js';

const prisma = new PrismaClient();

async function syncCompletitud() {
    const numeroProtocolo = process.argv[2];

    if (!numeroProtocolo) {
        console.log('Uso: node scripts/sync-completitud.js [numeroProtocolo]');
        console.log('');
        console.log('Sincronizando TODOS los protocolos...');

        const protocolos = await prisma.protocoloUAFE.findMany({
            select: { id: true, numeroProtocolo: true }
        });

        for (const p of protocolos) {
            console.log(`\nSincronizando protocolo: ${p.numeroProtocolo || p.id}`);
            try {
                const resultado = await sincronizarCompletitudProtocolo(p.id);
                console.log(`  ✅ ${resultado.totalParticipantes} participantes actualizados`);
                resultado.actualizaciones.forEach(a => {
                    console.log(`     - ${a.personaCedula}: ${a.estadoAnterior} → ${a.estadoNuevo} (${a.porcentaje}%)`);
                });
            } catch (e) {
                console.log(`  ❌ Error: ${e.message}`);
            }
        }
    } else {
        // Buscar protocolo específico
        const protocolo = await prisma.protocoloUAFE.findFirst({
            where: {
                OR: [
                    { numeroProtocolo: numeroProtocolo },
                    { id: numeroProtocolo }
                ]
            }
        });

        if (!protocolo) {
            console.log('❌ Protocolo no encontrado:', numeroProtocolo);
            await prisma.$disconnect();
            return;
        }

        console.log(`Sincronizando protocolo: ${protocolo.numeroProtocolo}`);
        const resultado = await sincronizarCompletitudProtocolo(protocolo.id);

        console.log(`\n✅ ${resultado.totalParticipantes} participantes actualizados:`);
        resultado.actualizaciones.forEach(a => {
            console.log(`  - ${a.personaCedula}: ${a.estadoAnterior} → ${a.estadoNuevo} (${a.porcentaje}%)`);
        });
    }

    await prisma.$disconnect();
}

syncCompletitud().catch(console.error);
