/**
 * Script para resetear documentos y notificaciones
 * CONSERVA USUARIOS - Solo elimina documentos, eventos y grupos
 * 
 * Uso: node scripts/reset-documents.js
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

// Interfaz para confirmar con el usuario
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function resetDocuments() {
    try {
        console.log('🔍 REVISANDO ESTADO ACTUAL DE LA BASE DE DATOS...\n');
        
        // Mostrar estado actual
        const currentStats = await prisma.$transaction([
            prisma.user.count(),
            prisma.document.count(),
            prisma.documentGroup.count(),
            prisma.documentEvent.count()
        ]);

        console.log('📊 ESTADO ACTUAL:');
        console.log(`   👥 Usuarios: ${currentStats[0]}`);
        console.log(`   📄 Documentos: ${currentStats[1]}`);
        console.log(`   📦 Grupos: ${currentStats[2]}`);
        console.log(`   📋 Eventos: ${currentStats[3]}\n`);

        if (currentStats[1] === 0 && currentStats[2] === 0 && currentStats[3] === 0) {
            console.log('✅ La base de datos ya está limpia (sin documentos, grupos o eventos)');
            console.log('✅ Los usuarios están conservados\n');
            return;
        }

        // Confirmar operación
        const confirm1 = await askQuestion(
            '⚠️  ADVERTENCIA: Esta operación eliminará TODOS los documentos, grupos y eventos.\n' +
            '   Los USUARIOS se mantendrán intactos.\n' +
            '   ¿Estás seguro? (escribe "CONFIRMAR" para proceder): '
        );

        if (confirm1 !== 'CONFIRMAR') {
            console.log('❌ Operación cancelada por el usuario');
            return;
        }

        const confirm2 = await askQuestion(
            '🔒 CONFIRMACIÓN FINAL: ¿Proceder con la limpieza? (escribe "SI" para ejecutar): '
        );

        if (confirm2 !== 'SI') {
            console.log('❌ Operación cancelada por el usuario');
            return;
        }

        console.log('\n🧹 INICIANDO LIMPIEZA DE LA BASE DE DATOS...\n');

        // Ejecutar limpieza en transacción
        await prisma.$transaction(async (tx) => {
            console.log('🗑️  Eliminando eventos de documentos...');
            const deletedEvents = await tx.documentEvent.deleteMany();
            console.log(`   ✅ ${deletedEvents.count} eventos eliminados`);

            console.log('🗑️  Eliminando documentos...');
            const deletedDocuments = await tx.document.deleteMany();
            console.log(`   ✅ ${deletedDocuments.count} documentos eliminados`);

            console.log('🗑️  Eliminando grupos de documentos...');
            const deletedGroups = await tx.documentGroup.deleteMany();
            console.log(`   ✅ ${deletedGroups.count} grupos eliminados`);

            // Opcional: limpiar tabla de prueba
            console.log('🗑️  Eliminando datos de prueba...');
            const deletedTests = await tx.testConnection.deleteMany();
            console.log(`   ✅ ${deletedTests.count} registros de prueba eliminados`);
        });

        // Verificar estado final
        console.log('\n🔍 VERIFICANDO RESULTADO...\n');
        
        const finalStats = await prisma.$transaction([
            prisma.user.count(),
            prisma.document.count(),
            prisma.documentGroup.count(),
            prisma.documentEvent.count()
        ]);

        console.log('📊 ESTADO FINAL:');
        console.log(`   👥 Usuarios conservados: ${finalStats[0]}`);
        console.log(`   📄 Documentos restantes: ${finalStats[1]}`);
        console.log(`   📦 Grupos restantes: ${finalStats[2]}`);
        console.log(`   📋 Eventos restantes: ${finalStats[3]}\n`);

        if (finalStats[1] === 0 && finalStats[2] === 0 && finalStats[3] === 0) {
            console.log('✅ LIMPIEZA COMPLETADA EXITOSAMENTE');
            console.log('✅ Base de datos lista para recibir documentos reales');
            console.log('✅ Usuarios conservados intactos\n');
        } else {
            console.log('⚠️  ADVERTENCIA: Algunos datos no fueron eliminados completamente');
        }

    } catch (error) {
        console.error('❌ ERROR durante la limpieza:', error);
        throw error;
    }
}

async function main() {
    try {
        await resetDocuments();
    } catch (error) {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    } finally {
        rl.close();
        await prisma.$disconnect();
    }
}

// Ejecutar script
console.log('🚀 SCRIPT DE LIMPIEZA DE DOCUMENTOS');
console.log('   Desarrollado para Notaría Segura');
console.log('   Conservador y Seguro\n');

main();