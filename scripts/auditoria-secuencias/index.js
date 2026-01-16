import pg from 'pg';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { CONFIG, generarCodigoBarras, parsearCodigoBarras } from './config.js';

// Configurar dotenv para leer .env desde el directorio del script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const { Pool } = pg;

/**
 * Conecta a la base de datos PostgreSQL
 */
async function conectarDB() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('❌ DATABASE_URL no está definida en el archivo .env');
    }

    const pool = new Pool({
        connectionString,
        ssl: false // Railway no requiere SSL para TCP proxy
    });

    return pool;
}

/**
 * Obtiene todos los documentos del período de análisis
 */
async function obtenerDocumentos(pool) {
    const query = `
    SELECT 
      "protocolNumber" as codigo_barras,
      "createdAt" as fecha_registro
    FROM "documents"
    WHERE "protocolNumber" IS NOT NULL
      AND "createdAt" >= $1
      AND "createdAt" <= $2
    ORDER BY "protocolNumber"
  `;

    const result = await pool.query(query, [CONFIG.FECHA_INICIO, CONFIG.FECHA_FIN]);
    return result.rows;
}

/**
 * Agrupa documentos por libro y año
 */
function agruparDocumentos(documentos) {
    const grupos = {};

    for (const doc of documentos) {
        const parsed = parsearCodigoBarras(doc.codigo_barras);

        if (!parsed || parsed.codigoNotaria !== CONFIG.CODIGO_NOTARIA) {
            continue; // Ignorar códigos inválidos o de otra notaría
        }

        const { tipoLibro, anio, numeroSecuencial } = parsed;

        if (!grupos[tipoLibro]) {
            grupos[tipoLibro] = {};
        }

        if (!grupos[tipoLibro][anio]) {
            grupos[tipoLibro][anio] = [];
        }

        grupos[tipoLibro][anio].push({
            numero: numeroSecuencial,
            fecha: new Date(doc.fecha_registro),
            codigoCompleto: doc.codigo_barras
        });
    }

    // Ordenar por número dentro de cada grupo
    for (const libro in grupos) {
        for (const anio in grupos[libro]) {
            grupos[libro][anio].sort((a, b) => a.numero - b.numero);
        }
    }

    return grupos;
}

/**
 * Analiza secuencias y encuentra números faltantes
 */
function analizarSecuencias(grupos) {
    const resultados = {
        resumen: [],
        faltantes: [],
        encontrados: []
    };

    for (const [tipoLibro, configLibro] of Object.entries(CONFIG.RANGOS)) {
        for (const anio of [2025, 2026]) {
            const rango = configLibro[anio];
            if (!rango) continue;

            const documentosAno = grupos[tipoLibro]?.[anio] || [];
            const totalEsperados = rango.fin - rango.inicio + 1;
            const encontrados = documentosAno.length;

            // Generar lista completa esperada
            const numerosEsperados = new Set();
            for (let i = rango.inicio; i <= rango.fin; i++) {
                numerosEsperados.add(i);
            }

            // Marcar números encontrados
            const numerosEncontrados = new Set(documentosAno.map(d => d.numero));

            // Encontrar faltantes
            const numerosFaltantes = Array.from(numerosEsperados).filter(
                num => !numerosEncontrados.has(num)
            );

            // Resumen
            resultados.resumen.push({
                libro: configLibro.nombre,
                tipoLibro,
                anio,
                rangoAnalizado: `${String(rango.inicio).padStart(5, '0')} - ${String(rango.fin).padStart(5, '0')}`,
                totalEsperados,
                encontrados,
                faltantes: numerosFaltantes.length,
                completitud: ((encontrados / totalEsperados) * 100).toFixed(2) + '%'
            });

            // Detalles de faltantes
            for (const numFaltante of numerosFaltantes) {
                const estimacion = estimarFechaFaltante(numFaltante, documentosAno);
                const codigoCompleto = generarCodigoBarras(anio, tipoLibro, numFaltante);

                resultados.faltantes.push({
                    libro: configLibro.nombre,
                    tipoLibro,
                    anio,
                    codigoCompleto,
                    numeroSecuencial: numFaltante,
                    fechaEstimada: estimacion.fecha,
                    docAnterior: estimacion.anterior,
                    docSiguiente: estimacion.siguiente
                });
            }

            // Documentos encontrados
            for (const doc of documentosAno) {
                resultados.encontrados.push({
                    codigoBarras: doc.codigoCompleto,
                    libro: configLibro.nombre,
                    tipoLibro,
                    anio,
                    numero: doc.numero,
                    fechaRegistro: doc.fecha
                });
            }
        }
    }

    return resultados;
}

/**
 * Estima la fecha de un documento faltante usando interpolación lineal
 */
function estimarFechaFaltante(numeroFaltante, documentos) {
    // Encontrar documento anterior más cercano
    let anterior = null;
    for (let i = documentos.length - 1; i >= 0; i--) {
        if (documentos[i].numero < numeroFaltante) {
            anterior = documentos[i];
            break;
        }
    }

    // Encontrar documento siguiente más cercano
    let siguiente = null;
    for (let i = 0; i < documentos.length; i++) {
        if (documentos[i].numero > numeroFaltante) {
            siguiente = documentos[i];
            break;
        }
    }

    // Interpolar fecha
    let fechaEstimada = '';

    if (anterior && siguiente) {
        const rangoNumeros = siguiente.numero - anterior.numero;
        const posicionRelativa = (numeroFaltante - anterior.numero) / rangoNumeros;
        const tiempoMs = siguiente.fecha.getTime() - anterior.fecha.getTime();
        const fechaInterpolada = new Date(anterior.fecha.getTime() + (tiempoMs * posicionRelativa));
        fechaEstimada = fechaInterpolada.toISOString().split('T')[0] + ' ~' +
            fechaInterpolada.toTimeString().substring(0, 5);
    } else if (anterior) {
        fechaEstimada = `Después de ${anterior.fecha.toISOString().split('T')[0]} (estimación)`;
    } else if (siguiente) {
        fechaEstimada = `Antes de ${siguiente.fecha.toISOString().split('T')[0]} (estimación)`;
    } else {
        fechaEstimada = 'Sin datos para estimar';
    }

    return {
        fecha: fechaEstimada,
        anterior: anterior ? `#${String(anterior.numero).padStart(5, '0')} (${anterior.fecha.toISOString().split('T')[0]})` : 'N/A',
        siguiente: siguiente ? `#${String(siguiente.numero).padStart(5, '0')} (${siguiente.fecha.toISOString().split('T')[0]})` : 'N/A'
    };
}

/**
 * Genera el reporte Excel
 */
async function generarReporteExcel(resultados) {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Notaría Segura';
    workbook.created = new Date();

    // ===== HOJA 1: RESUMEN =====
    const hojaResumen = workbook.addWorksheet('Resumen');

    hojaResumen.columns = [
        { header: 'Libro', key: 'libro', width: 20 },
        { header: 'Año', key: 'anio', width: 8 },
        { header: 'Rango Analizado', key: 'rangoAnalizado', width: 20 },
        { header: 'Total Esperados', key: 'totalEsperados', width: 15 },
        { header: 'Encontrados', key: 'encontrados', width: 15 },
        { header: 'Faltantes', key: 'faltantes', width: 12 },
        { header: '% Completitud', key: 'completitud', width: 15 }
    ];

    hojaResumen.addRows(resultados.resumen);

    // Estilo de encabezado
    hojaResumen.getRow(1).font = { bold: true };
    hojaResumen.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    hojaResumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ===== HOJA 2: DETALLE FALTANTES =====
    const hojaFaltantes = workbook.addWorksheet('Detalle Faltantes');

    hojaFaltantes.columns = [
        { header: '#', key: 'index', width: 6 },
        { header: 'Libro', key: 'libro', width: 20 },
        { header: 'Año', key: 'anio', width: 8 },
        { header: 'Código Completo', key: 'codigoCompleto', width: 20 },
        { header: 'Número Secuencial', key: 'numeroSecuencial', width: 18 },
        { header: 'Fecha Estimada', key: 'fechaEstimada', width: 30 },
        { header: 'Doc Anterior', key: 'docAnterior', width: 25 },
        { header: 'Doc Siguiente', key: 'docSiguiente', width: 25 }
    ];

    resultados.faltantes.forEach((faltante, index) => {
        hojaFaltantes.addRow({
            index: index + 1,
            ...faltante
        });
    });

    hojaFaltantes.getRow(1).font = { bold: true };
    hojaFaltantes.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFED7D31' }
    };
    hojaFaltantes.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // ===== HOJA 3: DOCUMENTOS ENCONTRADOS =====
    const hojaEncontrados = workbook.addWorksheet('Documentos Encontrados');

    hojaEncontrados.columns = [
        { header: 'Código Barras', key: 'codigoBarras', width: 20 },
        { header: 'Libro', key: 'libro', width: 20 },
        { header: 'Año', key: 'anio', width: 8 },
        { header: 'Número', key: 'numero', width: 12 },
        { header: 'Fecha Registro', key: 'fechaRegistro', width: 20 }
    ];

    hojaEncontrados.addRows(resultados.encontrados.map(doc => ({
        ...doc,
        fechaRegistro: doc.fechaRegistro.toISOString().replace('T', ' ').substring(0, 19)
    })));

    hojaEncontrados.getRow(1).font = { bold: true };
    hojaEncontrados.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
    };
    hojaEncontrados.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Guardar archivo
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').substring(0, 15);
    const nombreArchivo = `reporte_auditoria_secuencias_${timestamp}.xlsx`;
    const rutaArchivo = join(__dirname, nombreArchivo);

    await workbook.xlsx.writeFile(rutaArchivo);

    return { nombreArchivo, rutaArchivo, resultados };
}

/**
 * Muestra un resumen en consola
 */
function mostrarResumenConsola(resultados) {
    const totalEsperados = resultados.resumen.reduce((sum, r) => sum + r.totalEsperados, 0);
    const totalEncontrados = resultados.resumen.reduce((sum, r) => sum + r.encontrados, 0);
    const totalFaltantes = resultados.resumen.reduce((sum, r) => sum + r.faltantes, 0);
    const completitudGeneral = ((totalEncontrados / totalEsperados) * 100).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('RESUMEN GENERAL');
    console.log('='.repeat(50));
    console.log(`📊 Total documentos esperados: ${totalEsperados}`);
    console.log(`✅ Total encontrados: ${totalEncontrados}`);
    console.log(`❌ Total faltantes: ${totalFaltantes}`);
    console.log(`📈 Completitud general: ${completitudGeneral}%`);
    console.log('='.repeat(50) + '\n');
}

/**
 * Función principal
 */
async function main() {
    console.log('\n🔍 AUDITORÍA DE SECUENCIAS DOCUMENTALES');
    console.log('=========================================\n');

    let pool;

    try {
        // 1. Conectar a base de datos
        console.log('Conectando a base de datos...  ');
        pool = await conectarDB();
        await pool.query('SELECT 1'); // Test de conexión
        console.log('✅ Conexión exitosa\n');

        // 2. Obtener documentos
        console.log('Consultando documentos...      ');
        const documentos = await obtenerDocumentos(pool);
        console.log(`✅ ${documentos.length} documentos encontrados\n`);

        if (documentos.length === 0) {
            console.log('⚠️  No se encontraron documentos en el período especificado.');
            console.log(`   Período: ${CONFIG.FECHA_INICIO} a ${CONFIG.FECHA_FIN}`);
            return;
        }

        // 3. Agrupar por libro y año
        const grupos = agruparDocumentos(documentos);

        // 4. Analizar cada libro
        console.log('Analizando secuencias por libro:\n');

        for (const [tipoLibro, configLibro] of Object.entries(CONFIG.RANGOS)) {
            console.log(`📚 ${configLibro.nombre} (${tipoLibro})...`);

            for (const anio of [2025, 2026]) {
                const rango = configLibro[anio];
                if (!rango) continue;

                const documentosAno = grupos[tipoLibro]?.[anio] || [];
                const totalEsperados = rango.fin - rango.inicio + 1;
                const encontrados = documentosAno.length;
                const faltantes = totalEsperados - encontrados;

                console.log(`   - ${anio}: ${encontrados}/${totalEsperados} documentos, ${faltantes} faltantes`);
            }
            console.log('');
        }

        // 5. Analizar secuencias completas
        const resultados = analizarSecuencias(grupos);

        // 6. Generar reporte Excel
        console.log('Generando reporte Excel...     ');
        const { nombreArchivo, rutaArchivo } = await generarReporteExcel(resultados);
        console.log(`✅ Reporte guardado\n`);

        // 7. Mostrar resumen
        mostrarResumenConsola(resultados);

        console.log(`📄 Archivo generado: ${nombreArchivo}`);
        console.log(`📂 Ubicación: ${rutaArchivo}\n`);

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error('\nDetalles:', error);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Sugerencia: Verifica que la URL de conexión sea correcta.');
            console.error('   Revisa el archivo .env y asegúrate de que DATABASE_URL esté configurada.');
        } else if (error.message.includes('relation') || error.message.includes('column')) {
            console.error('\n💡 Sugerencia: Verifica el nombre de la tabla y columnas en la base de datos.');
        }

        process.exit(1);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Ejecutar script
main();
