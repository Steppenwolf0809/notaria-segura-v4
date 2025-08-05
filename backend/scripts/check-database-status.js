/**
 * Script para verificar el estado actual de la base de datos
 * NO HACE CAMBIOS - Solo muestra información
 * 
 * Uso: node scripts/check-database-status.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabaseStatus() {
    try {
        console.log('🔍 REVISANDO ESTADO DE LA BASE DE DATOS...\n');

        // Contar registros en todas las tablas principales
        const stats = await prisma.$transaction([
            prisma.user.count(),
            prisma.document.count(),
            prisma.documentGroup.count(),
            prisma.documentEvent.count(),
            prisma.testConnection.count()
        ]);

        console.log('📊 ESTADÍSTICAS GENERALES:');
        console.log(`   👥 Usuarios: ${stats[0]}`);
        console.log(`   📄 Documentos: ${stats[1]}`);
        console.log(`   📦 Grupos de documentos: ${stats[2]}`);
        console.log(`   📋 Eventos de auditoría: ${stats[3]}`);
        console.log(`   🔧 Registros de prueba: ${stats[4]}\n`);

        // Detalles de usuarios
        if (stats[0] > 0) {
            console.log('👥 DETALLE DE USUARIOS:');
            const users = await prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });

            users.forEach(user => {
                const status = user.isActive ? '✅' : '❌';
                console.log(`   ${status} ${user.firstName} ${user.lastName} (${user.email})`);
                console.log(`       Rol: ${user.role} | ID: ${user.id}`);
            });
            console.log();
        }

        // Estadísticas de documentos por estado
        if (stats[1] > 0) {
            console.log('📄 DOCUMENTOS POR ESTADO:');
            const docStats = await prisma.document.groupBy({
                by: ['status'],
                _count: { status: true }
            });

            docStats.forEach(stat => {
                console.log(`   📋 ${stat.status}: ${stat._count.status} documentos`);
            });

            console.log('\n📄 DOCUMENTOS POR TIPO:');
            const typeStats = await prisma.document.groupBy({
                by: ['documentType'],
                _count: { documentType: true }
            });

            typeStats.forEach(stat => {
                console.log(`   📑 ${stat.documentType}: ${stat._count.documentType} documentos`);
            });
            console.log();
        }

        // Estado de grupos
        if (stats[2] > 0) {
            console.log('📦 GRUPOS POR ESTADO:');
            const groupStats = await prisma.documentGroup.groupBy({
                by: ['status'],
                _count: { status: true }
            });

            groupStats.forEach(stat => {
                console.log(`   📊 ${stat.status}: ${stat._count.status} grupos`);
            });
            console.log();
        }

        // Últimos eventos de auditoría
        if (stats[3] > 0) {
            console.log('📋 ÚLTIMOS EVENTOS DE AUDITORÍA:');
            const recentEvents = await prisma.documentEvent.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { firstName: true, lastName: true, role: true }
                    }
                }
            });

            recentEvents.forEach(event => {
                const date = event.createdAt.toLocaleString('es-ES');
                console.log(`   📅 ${date} - ${event.eventType}`);
                console.log(`       👤 ${event.user.firstName} ${event.user.lastName} (${event.user.role})`);
                console.log(`       📝 ${event.description}`);
            });
            console.log();
        }

        // Diagnóstico final
        console.log('🎯 DIAGNÓSTICO:');
        
        if (stats[0] === 0) {
            console.log('   ⚠️  NO HAY USUARIOS en el sistema');
        } else {
            console.log(`   ✅ Sistema tiene ${stats[0]} usuarios activos`);
        }

        if (stats[1] === 0 && stats[2] === 0 && stats[3] === 0) {
            console.log('   ✅ Base de datos limpia (sin documentos, grupos o eventos)');
            console.log('   ✅ Lista para recibir documentos reales');
        } else {
            console.log(`   📊 Base de datos contiene datos de prueba/desarrollo`);
            console.log('   💡 Considera usar el script reset-documents.js para limpiar');
        }

        console.log();

    } catch (error) {
        console.error('❌ ERROR al verificar la base de datos:', error);
        throw error;
    }
}

async function main() {
    try {
        await checkDatabaseStatus();
    } catch (error) {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Ejecutar script
console.log('🔍 VERIFICADOR DE ESTADO DE BASE DE DATOS');
console.log('   Notaría Segura - Modo Conservador\n');

main();