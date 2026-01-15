// Script para diagnosticar y corregir problema de persona sin nombre
// Uso: node scripts/diagnose-persona.js 1104605306

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnosticar(cedula) {
    console.log(`\n=== Diagnóstico para cédula: ${cedula} ===\n`);

    // 1. Buscar en PersonaRegistrada
    const persona = await prisma.personaRegistrada.findUnique({
        where: { numeroIdentificacion: cedula },
        select: {
            id: true,
            numeroIdentificacion: true,
            tipoPersona: true,
            completado: true,
            pinCreado: true,
            datosPersonaNatural: true,
            createdAt: true,
            updatedAt: true
        }
    });

    if (!persona) {
        console.log('❌ Persona NO encontrada en PersonaRegistrada');
        return;
    }

    console.log('✅ Persona encontrada en PersonaRegistrada:');
    console.log('   ID:', persona.id);
    console.log('   Tipo:', persona.tipoPersona);
    console.log('   Completado:', persona.completado);
    console.log('   PIN Creado:', persona.pinCreado);
    console.log('   Creado:', persona.createdAt);
    console.log('   Actualizado:', persona.updatedAt);

    // Extraer nombre
    const datos = persona.datosPersonaNatural;
    if (datos?.datosPersonales) {
        const { nombres, apellidos, genero, estadoCivil } = datos.datosPersonales;
        console.log('\n   📋 Datos Personales:');
        console.log(`      Nombres: "${nombres || 'VACÍO'}"`);
        console.log(`      Apellidos: "${apellidos || 'VACÍO'}"`);
        console.log(`      Género: ${genero || 'NO DEFINIDO'}`);
        console.log(`      Estado Civil: ${estadoCivil || 'NO DEFINIDO'}`);
    } else {
        console.log('\n   ⚠️ datosPersonales está VACÍO o no existe');
    }

    // 2. Buscar en PersonaProtocolo
    const protocolos = await prisma.personaProtocolo.findMany({
        where: { personaCedula: cedula },
        include: {
            protocolo: {
                select: { id: true, numeroProtocolo: true, identificadorTemporal: true }
            }
        }
    });

    console.log(`\n=== En ${protocolos.length} Protocolo(s) ===`);
    for (const pp of protocolos) {
        console.log(`\n   Protocolo: ${pp.protocolo.numeroProtocolo || pp.protocolo.identificadorTemporal}`);
        console.log(`   Calidad: ${pp.calidad}`);
        console.log(`   Estado Completitud: ${pp.estadoCompletitud}`);
        console.log(`   Porcentaje: ${pp.porcentajeCompletitud}%`);
        console.log(`   Campos Faltantes: ${pp.camposFaltantes?.join(', ') || 'ninguno'}`);
    }

    // 3. Verificar si es placeholder (datos vacíos)
    const esPlaceholder = !datos?.datosPersonales?.nombres || !datos?.datosPersonales?.apellidos;

    if (esPlaceholder) {
        console.log('\n⚠️ PROBLEMA DETECTADO: Este registro es un PLACEHOLDER sin datos reales');
        console.log('   Solución: La persona debe completar su registro en /registro-personal');
    }

    await prisma.$disconnect();
}

const cedula = process.argv[2] || '1104605306';
diagnosticar(cedula).catch(console.error);
