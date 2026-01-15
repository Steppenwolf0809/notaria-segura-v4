/**
 * Script de Limpieza de Estados Documentales
 * 
 * Actualiza documentos de EN_PROCESO/LISTO a ENTREGADO para matrizadores específicos,
 * exceptuando los códigos listados en excepciones.txt
 * 
 * Uso:
 *   npm run preview   - Ver cambios sin modificar BD
 *   npm run ejecutar  - Aplicar cambios con confirmación
 */

import pg from 'pg';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// IDs de matrizadores a afectar
const MATRIZADORES_IDS = [8, 12];
const MATRIZADORES_NOMBRES = {
    8: 'FRANCISCO ESTEBAN PROAÑO ASTUDILLO',
    12: 'MAYRA CRISTINA CORELLA PARRA'
};

/**
 * Lee el archivo de excepciones y retorna un Set con los códigos
 */
function cargarExcepciones() {
    const rutaExcepciones = path.join(__dirname, 'excepciones.txt');

    if (!fs.existsSync(rutaExcepciones)) {
        console.log('⚠️  No se encontró archivo excepciones.txt');
        return new Set();
    }

    const contenido = fs.readFileSync(rutaExcepciones, 'utf-8');
    const excepciones = new Set();

    contenido.split('\n').forEach(linea => {
        const limpia = linea.trim();
        // Ignorar líneas vacías y comentarios
        if (limpia && !limpia.startsWith('#')) {
            excepciones.add(limpia);
        }
    });

    return excepciones;
}

/**
 * Crea conexión a la base de datos
 */
async function conectarDB() {
    const client = new pg.Client({
        connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    return client;
}

/**
 * Obtiene estadísticas de documentos por matrizador
 */
async function obtenerEstadisticas(client) {
    // Estadísticas de matrizadores objetivo
    const statsMatrizadores = await client.query(`
    SELECT 
      "assignedToId",
      "status",
      COUNT(*) as cantidad
    FROM documents
    WHERE "assignedToId" IN (${MATRIZADORES_IDS.join(',')})
    GROUP BY "assignedToId", "status"
    ORDER BY "assignedToId", "status"
  `);

    // Documentos de otros matrizadores
    const statsOtros = await client.query(`
    SELECT COUNT(*) as cantidad
    FROM documents
    WHERE "assignedToId" NOT IN (${MATRIZADORES_IDS.join(',')})
      OR "assignedToId" IS NULL
  `);

    return {
        matrizadores: statsMatrizadores.rows,
        otros: parseInt(statsOtros.rows[0].cantidad)
    };
}

/**
 * Obtiene documentos que serían modificados
 */
async function obtenerDocumentosAModificar(client, excepciones) {
    const excepcionesList = Array.from(excepciones);

    let query = `
    SELECT 
      d."id",
      d."protocolNumber",
      d."status",
      d."assignedToId",
      d."documentType",
      d."clientName",
      d."createdAt"
    FROM documents d
    WHERE d."status" IN ('EN_PROCESO', 'LISTO')
      AND d."assignedToId" IN (${MATRIZADORES_IDS.join(',')})
  `;

    if (excepcionesList.length > 0) {
        const placeholders = excepcionesList.map((_, i) => `$${i + 1}`).join(',');
        query += ` AND d."protocolNumber" NOT IN (${placeholders})`;
    }

    query += ` ORDER BY d."assignedToId", d."protocolNumber"`;

    const result = await client.query(query, excepcionesList);
    return result.rows;
}

/**
 * Obtiene documentos que están en excepciones
 */
async function obtenerDocumentosExceptuados(client, excepciones) {
    const excepcionesList = Array.from(excepciones);

    if (excepcionesList.length === 0) return [];

    const placeholders = excepcionesList.map((_, i) => `$${i + 1}`).join(',');

    const result = await client.query(`
    SELECT 
      d."id",
      d."protocolNumber",
      d."status",
      d."assignedToId",
      d."documentType",
      d."clientName"
    FROM documents d
    WHERE d."protocolNumber" IN (${placeholders})
    ORDER BY d."protocolNumber"
  `, excepcionesList);

    return result.rows;
}

/**
 * Muestra el preview de cambios
 */
async function mostrarPreview(client, excepciones) {
    console.log('\n🔍 PREVIEW DE LIMPIEZA DE ESTADOS');
    console.log('==================================');
    console.log(`📋 Excepciones cargadas: ${excepciones.size} códigos`);
    console.log('👤 Matrizadores afectados:');
    MATRIZADORES_IDS.forEach(id => {
        console.log(`   - ${MATRIZADORES_NOMBRES[id]} (ID: ${id})`);
    });

    const stats = await obtenerEstadisticas(client);

    // Procesar estadísticas por matrizador
    const porMatrizador = {};
    MATRIZADORES_IDS.forEach(id => {
        porMatrizador[id] = { EN_PROCESO: 0, LISTO: 0, ENTREGADO: 0 };
    });

    stats.matrizadores.forEach(row => {
        if (porMatrizador[row.assignedToId]) {
            porMatrizador[row.assignedToId][row.status] = parseInt(row.cantidad);
        }
    });

    console.log('\nDOCUMENTOS DE ESTOS MATRIZADORES:');
    let totalEnProceso = 0, totalListo = 0, totalEntregado = 0;

    MATRIZADORES_IDS.forEach(id => {
        const s = porMatrizador[id];
        totalEnProceso += s.EN_PROCESO;
        totalListo += s.LISTO;
        totalEntregado += s.ENTREGADO;
    });

    console.log(`- EN_PROCESO: ${totalEnProceso}`);
    console.log(`- LISTO: ${totalListo}`);
    console.log(`- ENTREGADO: ${totalEntregado}`);

    // Obtener documentos a modificar y exceptuados
    const aModificar = await obtenerDocumentosAModificar(client, excepciones);
    const exceptuados = await obtenerDocumentosExceptuados(client, excepciones);

    // Contar exceptuados por estado (solo los que están en EN_PROCESO o LISTO)
    let exceptEnProceso = 0, exceptListo = 0;
    exceptuados.forEach(doc => {
        if (doc.status === 'EN_PROCESO') exceptEnProceso++;
        if (doc.status === 'LISTO') exceptListo++;
    });

    const nuevosEntregados = aModificar.length;
    const deEnProcesoAEntregado = aModificar.filter(d => d.status === 'EN_PROCESO').length;
    const deListoAEntregado = aModificar.filter(d => d.status === 'LISTO').length;

    console.log('\nDESPUÉS DE LIMPIEZA:');
    console.log(`- EN_PROCESO: ${exceptEnProceso} (en excepciones)`);
    console.log(`- LISTO: ${exceptListo} (en excepciones)`);
    console.log(`- ENTREGADO: ${totalEntregado + nuevosEntregados} (+${nuevosEntregados} nuevos)`);

    console.log(`\n⚠️  Documentos de OTROS matrizadores: ${stats.otros} (NO SE TOCARÁN)`);

    // Tabla de cambios pendientes
    if (aModificar.length > 0) {
        console.log('\nDETALLE DE CAMBIOS PENDIENTES:');
        console.log('┌──────────────────────┬─────────────┬──────────────┬─────────────────────────────────┐');
        console.log('│ Número Protocolo     │ Estado Actual│ Nuevo Estado │ Matrizador                      │');
        console.log('├──────────────────────┼─────────────┼──────────────┼─────────────────────────────────┤');

        const mostrar = aModificar.slice(0, 20);
        mostrar.forEach(doc => {
            const codigo = (doc.protocolNumber || 'N/A').substring(0, 20).padEnd(20);
            const estado = doc.status.padEnd(11);
            const nuevo = 'ENTREGADO'.padEnd(12);
            const matrizador = (MATRIZADORES_NOMBRES[doc.assignedToId] || 'N/A').substring(0, 31).padEnd(31);
            console.log(`│ ${codigo} │ ${estado} │ ${nuevo} │ ${matrizador} │`);
        });

        if (aModificar.length > 20) {
            console.log(`│ ... y ${aModificar.length - 20} más                                                                    │`);
        }

        console.log('└──────────────────────┴─────────────┴──────────────┴─────────────────────────────────┘');
    }

    console.log(`\n📊 Resumen:`);
    console.log(`   Total a modificar: ${aModificar.length} documentos (solo de Mayra y Francisco)`);
    console.log(`   - ${deEnProcesoAEntregado} de EN_PROCESO → ENTREGADO`);
    console.log(`   - ${deListoAEntregado} de LISTO → ENTREGADO`);
    console.log(`   Excepciones respetadas: ${exceptuados.length}`);

    console.log('\n⚠️  Este es solo un PREVIEW. Para aplicar cambios ejecute:');
    console.log('    npm run ejecutar\n');

    return { aModificar, exceptuados, deEnProcesoAEntregado, deListoAEntregado };
}

/**
 * Solicita confirmación al usuario
 */
function preguntar(pregunta) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(pregunta, respuesta => {
            rl.close();
            resolve(respuesta.toLowerCase().trim());
        });
    });
}

/**
 * Muestra barra de progreso
 */
function mostrarProgreso(actual, total) {
    const porcentaje = Math.round((actual / total) * 100);
    const barraLlena = Math.round(porcentaje / 2.5);
    const barraVacia = 40 - barraLlena;
    const barra = '█'.repeat(barraLlena) + '░'.repeat(barraVacia);
    process.stdout.write(`\r[${barra}] ${porcentaje}% | ${actual}/${total}`);
}

/**
 * Genera el reporte Excel
 */
async function generarReporte(aModificar, exceptuados, deEnProcesoAEntregado, deListoAEntregado, tiempoEjecucion, stats) {
    const workbook = new ExcelJS.Workbook();
    const fecha = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);

    // Hoja 1: Resumen
    const hojaResumen = workbook.addWorksheet('Resumen');
    hojaResumen.columns = [
        { header: 'Métrica', key: 'metrica', width: 45 },
        { header: 'Valor', key: 'valor', width: 40 }
    ];

    hojaResumen.addRows([
        { metrica: 'Fecha ejecución', valor: new Date().toLocaleString('es-EC') },
        { metrica: 'Matrizadores afectados', valor: Object.values(MATRIZADORES_NOMBRES).join(', ') },
        { metrica: 'Total modificados', valor: aModificar.length },
        { metrica: 'De EN_PROCESO a ENTREGADO', valor: deEnProcesoAEntregado },
        { metrica: 'De LISTO a ENTREGADO', valor: deListoAEntregado },
        { metrica: 'Excepciones respetadas', valor: exceptuados.length },
        { metrica: 'Docs de otros matrizadores (intactos)', valor: stats.otros },
        { metrica: 'Tiempo de ejecución', valor: `${tiempoEjecucion.toFixed(2)} segundos` }
    ]);

    // Estilo para el encabezado
    hojaResumen.getRow(1).font = { bold: true };
    hojaResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
    hojaResumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Hoja 2: Documentos Modificados
    const hojaModificados = workbook.addWorksheet('Documentos Modificados');
    hojaModificados.columns = [
        { header: 'Número Protocolo', key: 'protocolNumber', width: 22 },
        { header: 'Matrizador', key: 'matrizador', width: 40 },
        { header: 'Estado Anterior', key: 'estadoAnterior', width: 15 },
        { header: 'Nuevo Estado', key: 'nuevoEstado', width: 15 },
        { header: 'Tipo Documento', key: 'tipoDocumento', width: 20 },
        { header: 'Cliente', key: 'cliente', width: 35 },
        { header: 'Fecha Original', key: 'fechaOriginal', width: 20 }
    ];

    aModificar.forEach(doc => {
        hojaModificados.addRow({
            protocolNumber: doc.protocolNumber,
            matrizador: MATRIZADORES_NOMBRES[doc.assignedToId] || `ID: ${doc.assignedToId}`,
            estadoAnterior: doc.status,
            nuevoEstado: 'ENTREGADO',
            tipoDocumento: doc.documentType || 'N/A',
            cliente: doc.clientName || 'N/A',
            fechaOriginal: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('es-EC') : 'N/A'
        });
    });

    hojaModificados.getRow(1).font = { bold: true };
    hojaModificados.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
    hojaModificados.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Hoja 3: Excepciones (No Modificados)
    const hojaExcepciones = workbook.addWorksheet('Excepciones (No Modificados)');
    hojaExcepciones.columns = [
        { header: 'Número Protocolo', key: 'protocolNumber', width: 22 },
        { header: 'Matrizador', key: 'matrizador', width: 40 },
        { header: 'Estado Actual', key: 'estadoActual', width: 15 },
        { header: 'Tipo Documento', key: 'tipoDocumento', width: 20 },
        { header: 'Cliente', key: 'cliente', width: 35 }
    ];

    exceptuados.forEach(doc => {
        hojaExcepciones.addRow({
            protocolNumber: doc.protocolNumber,
            matrizador: MATRIZADORES_NOMBRES[doc.assignedToId] || `ID: ${doc.assignedToId}`,
            estadoActual: doc.status,
            tipoDocumento: doc.documentType || 'N/A',
            cliente: doc.clientName || 'N/A'
        });
    });

    hojaExcepciones.getRow(1).font = { bold: true };
    hojaExcepciones.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
    hojaExcepciones.getRow(1).font = { bold: true, color: { argb: 'FF000000' } };

    // Hoja 4: Resumen por Matrizador
    const hojaMatrizadores = workbook.addWorksheet('Resumen por Matrizador');
    hojaMatrizadores.columns = [
        { header: 'Matrizador', key: 'matrizador', width: 40 },
        { header: 'EN_PROCESO → ENTREGADO', key: 'enProceso', width: 25 },
        { header: 'LISTO → ENTREGADO', key: 'listo', width: 20 },
        { header: 'Excepciones', key: 'excepciones', width: 15 },
        { header: 'Total Modificados', key: 'total', width: 18 }
    ];

    MATRIZADORES_IDS.forEach(id => {
        const docsMatrizador = aModificar.filter(d => d.assignedToId === id);
        const exceptMatrizador = exceptuados.filter(d => d.assignedToId === id);
        const enProceso = docsMatrizador.filter(d => d.status === 'EN_PROCESO').length;
        const listo = docsMatrizador.filter(d => d.status === 'LISTO').length;

        hojaMatrizadores.addRow({
            matrizador: MATRIZADORES_NOMBRES[id],
            enProceso: enProceso,
            listo: listo,
            excepciones: exceptMatrizador.length,
            total: docsMatrizador.length
        });
    });

    hojaMatrizadores.getRow(1).font = { bold: true };
    hojaMatrizadores.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5B9BD5' } };
    hojaMatrizadores.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Guardar archivo
    const nombreArchivo = `cambios_${fecha}.xlsx`;
    const rutaArchivo = path.join(__dirname, nombreArchivo);
    await workbook.xlsx.writeFile(rutaArchivo);

    return nombreArchivo;
}

/**
 * Ejecuta la actualización de estados
 */
async function ejecutarCambios(client, aModificar, excepciones) {
    const excepcionesList = Array.from(excepciones);

    console.log('\nEjecutando...');
    const inicio = Date.now();

    try {
        await client.query('BEGIN');

        // Construir query de actualización
        let query = `
      UPDATE documents
      SET 
        "status" = 'ENTREGADO',
        "updatedAt" = NOW()
      WHERE 
        "status" IN ('EN_PROCESO', 'LISTO')
        AND "assignedToId" IN (${MATRIZADORES_IDS.join(',')})
    `;

        if (excepcionesList.length > 0) {
            const placeholders = excepcionesList.map((_, i) => `$${i + 1}`).join(',');
            query += ` AND "protocolNumber" NOT IN (${placeholders})`;
        }

        const result = await client.query(query, excepcionesList);

        await client.query('COMMIT');

        const fin = Date.now();
        const tiempo = (fin - inicio) / 1000;

        console.log('\n');
        mostrarProgreso(aModificar.length, aModificar.length);
        console.log('\n');

        return { exito: true, actualizados: result.rowCount, tiempo };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error durante la ejecución:', error.message);
        console.log('🔄 Se realizó ROLLBACK - No se aplicaron cambios');
        return { exito: false, error: error.message };
    }
}

/**
 * Función principal
 */
async function main() {
    const args = process.argv.slice(2);
    const modoEjecutar = args.includes('--ejecutar');
    const modoPreview = args.includes('--preview') || !modoEjecutar;

    console.log('\n' + '='.repeat(50));
    console.log('  SCRIPT DE LIMPIEZA DE ESTADOS DOCUMENTALES');
    console.log('='.repeat(50));

    // Verificar DATABASE_URL
    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL no configurada en .env');
        process.exit(1);
    }

    // Cargar excepciones
    const excepciones = cargarExcepciones();

    let client;
    try {
        console.log('\n🔌 Conectando a la base de datos...');
        client = await conectarDB();
        console.log('✅ Conexión establecida');

        const stats = await obtenerEstadisticas(client);

        if (modoPreview) {
            await mostrarPreview(client, excepciones);
        } else {
            // Modo ejecutar
            console.log('\n🚨 MODO EJECUCIÓN - CAMBIOS EN PRODUCCIÓN');
            console.log('==========================================');
            console.log(`📋 Excepciones cargadas: ${excepciones.size} códigos`);

            const { aModificar, exceptuados, deEnProcesoAEntregado, deListoAEntregado } =
                await mostrarPreview(client, excepciones);

            if (aModificar.length === 0) {
                console.log('\n✅ No hay documentos para modificar.');
                return;
            }

            console.log('\n' + '⚠️'.repeat(20));

            // Doble confirmación
            const respBackup = await preguntar('⚠️  ¿Has verificado que tienes un backup reciente? (s/n): ');
            if (respBackup !== 's' && respBackup !== 'si') {
                console.log('\n❌ Operación cancelada. Realiza un backup primero.');
                return;
            }

            const respConfirm = await preguntar('⚠️  ¿Confirmas ejecutar los cambios? (s/n): ');
            if (respConfirm !== 's' && respConfirm !== 'si') {
                console.log('\n❌ Operación cancelada por el usuario.');
                return;
            }

            // Ejecutar cambios
            const resultado = await ejecutarCambios(client, aModificar, excepciones);

            if (resultado.exito) {
                console.log('✅ COMPLETADO');
                console.log(`- Documentos actualizados: ${resultado.actualizados}`);
                console.log(`- Tiempo: ${resultado.tiempo.toFixed(2)} segundos`);

                // Generar reporte
                console.log('\n📊 Generando reporte...');
                const nombreReporte = await generarReporte(
                    aModificar,
                    exceptuados,
                    deEnProcesoAEntregado,
                    deListoAEntregado,
                    resultado.tiempo,
                    stats
                );
                console.log(`✅ Reporte guardado: ${nombreReporte}`);
            }
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

main();
