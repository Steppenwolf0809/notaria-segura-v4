/**
 * Script para corregir clientTaxId de facturas
 * 
 * Problema: El XML de Koinor tiene teléfonos en el campo codcli en lugar del RUC
 * Solución: Actualizar clientTaxId de facturas usando el clientId del documento vinculado
 * 
 * Uso: node scripts/fix-invoice-clientTaxId.js [--dry-run]
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    console.log('🔧 Corrección de clientTaxId en facturas');
    console.log(`   Modo: ${DRY_RUN ? 'DRY-RUN (sin cambios)' : 'EJECUCIÓN REAL'}\n`);

    // 1. Buscar facturas con documentId que tienen clientTaxId diferente al clientId del documento
    const invoicesWithMismatch = await prisma.invoice.findMany({
        where: {
            documentId: { not: null }
        },
        include: {
            document: {
                select: {
                    id: true,
                    clientId: true,
                    clientName: true,
                    protocolNumber: true
                }
            }
        }
    });

    console.log(`📊 Total facturas con documento vinculado: ${invoicesWithMismatch.length}`);

    // 2. Filtrar las que tienen discrepancia
    const toFix = invoicesWithMismatch.filter(inv => {
        // El documento debe tener clientId
        if (!inv.document?.clientId) return false;
        
        const docClientId = inv.document.clientId.trim();
        const invClientTaxId = (inv.clientTaxId || '').trim();
        
        // Corregir si:
        // 1. clientTaxId está vacío
        // 2. clientTaxId parece un teléfono (empieza con 09 y tiene 10 dígitos)
        // 3. clientTaxId no coincide con el documento
        const isEmpty = !invClientTaxId || invClientTaxId === '';
        const looksLikePhone = /^09\d{8}$/.test(invClientTaxId);
        const mismatch = invClientTaxId !== docClientId;
        
        return isEmpty || looksLikePhone || (mismatch && invClientTaxId.length < 10);
    });

    console.log(`⚠️  Facturas con clientTaxId incorrecto: ${toFix.length}\n`);

    if (toFix.length === 0) {
        console.log('✅ No hay facturas que corregir');
        return;
    }

    // 3. Mostrar ejemplos
    console.log('📋 Ejemplos de correcciones:');
    const examples = toFix.slice(0, 10);
    for (const inv of examples) {
        console.log(`   ${inv.invoiceNumber}:`);
        console.log(`      Actual: "${inv.clientTaxId}" (${inv.clientName})`);
        console.log(`      Correcto: "${inv.document.clientId}" (${inv.document.clientName})`);
        console.log(`      Documento: ${inv.document.protocolNumber}`);
    }

    if (toFix.length > 10) {
        console.log(`   ... y ${toFix.length - 10} más\n`);
    }

    // 4. Aplicar correcciones
    if (!DRY_RUN) {
        console.log('\n🔄 Aplicando correcciones...');
        
        let fixed = 0;
        let errors = 0;

        for (const inv of toFix) {
            try {
                await prisma.invoice.update({
                    where: { id: inv.id },
                    data: {
                        clientTaxId: inv.document.clientId,
                        // También actualizar clientName si es diferente
                        clientName: inv.document.clientName
                    }
                });
                fixed++;
            } catch (error) {
                console.error(`   ❌ Error actualizando ${inv.invoiceNumber}:`, error.message);
                errors++;
            }
        }

        console.log(`\n✅ Correcciones aplicadas: ${fixed}`);
        if (errors > 0) {
            console.log(`❌ Errores: ${errors}`);
        }
    } else {
        console.log('\n⚠️  Modo DRY-RUN: No se aplicaron cambios');
        console.log('   Ejecuta sin --dry-run para aplicar las correcciones');
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
