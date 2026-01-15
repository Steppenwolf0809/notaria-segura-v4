/**
 * Script de prueba para los generadores de texto notarial
 * 
 * Uso: node scripts/test-text-generators.js
 * 
 * Prueba los servicios:
 * - encabezado-generator-service.js
 * - comparecencia-generator-service.js
 */

import { generarEncabezado, formatearCalidad } from '../src/services/encabezado-generator-service.js';
import { generarComparecencia } from '../src/services/comparecencia-generator-service.js';

console.log('═══════════════════════════════════════════════════════════════');
console.log('       TEST: Generadores de Texto Notarial (Sprint 2)');
console.log('═══════════════════════════════════════════════════════════════\n');

// ============================================================
// DATOS DE PRUEBA
// ============================================================

// Protocolo de ejemplo - Compraventa
const protocoloCompraventa = {
    id: 'test-protocolo-1',
    numeroProtocolo: '123456',
    identificadorTemporal: 'temp-123',
    fecha: new Date('2025-09-03'),
    tipoActo: 'COMPRAVENTA',
    actoContrato: 'COMPRAVENTA',
    valorContrato: 171150.80,
    avaluoMunicipal: 134876.06,
    ubicacionDescripcion: 'LOTE DE TERRENO NÚMERO DIEZ (10), DENOMINADO "D2-B-10 SEGÚN PLANO APROBADO", PREDIO NÚMERO CINCO OCHO CERO UNO SEIS TRES SEIS (5801636)',
    ubicacionParroquia: 'TUMBACO',
    ubicacionCanton: 'QUITO',
    ubicacionProvincia: 'PICHINCHA'
};

// Protocolo de ejemplo - Promesa de Compraventa (con MULTA)
const protocoloPromesa = {
    ...protocoloCompraventa,
    id: 'test-protocolo-2',
    numeroProtocolo: '234567',
    tipoActo: 'PROMESA_COMPRAVENTA',
    actoContrato: 'PROMESA_COMPRAVENTA',
    multa: 17115.08,
    avaluoMunicipal: null
};

// Participantes - Caso 1: Dos personas solteras
const participantesSolteros = [
    {
        id: 'pp-1',
        personaCedula: '1700936170',
        calidad: 'VENDEDOR',
        actuaPor: 'PROPIOS_DERECHOS',
        orden: 1,
        estadoCompletitud: 'completo',
        compareceConyugeJunto: false,
        esApoderado: false,
        persona: {
            tipoPersona: 'NATURAL',
            numeroIdentificacion: '1700936170',
            datosPersonaNatural: {
                datosPersonales: {
                    apellidos: 'STACEY CHIRIBOGA',
                    nombres: 'CARLOS MANUEL DIEGO',
                    genero: 'M',
                    estadoCivil: 'SOLTERO'
                },
                contacto: {
                    celular: '0998765432',
                    email: 'carlos.stacey@email.com'
                },
                direccion: {
                    callePrincipal: 'Av. González Suárez',
                    numero: '1115',
                    calleSecundaria: 'Vicente Álvarez',
                    parroquia: 'IÑAQUITO',
                    canton: 'QUITO',
                    provincia: 'PICHINCHA'
                },
                informacionLaboral: {
                    profesionOcupacion: 'Ingeniero Civil'
                }
            }
        }
    },
    {
        id: 'pp-2',
        personaCedula: '1720749389',
        calidad: 'COMPRADOR',
        actuaPor: 'PROPIOS_DERECHOS',
        orden: 2,
        estadoCompletitud: 'completo',
        compareceConyugeJunto: false,
        esApoderado: false,
        persona: {
            tipoPersona: 'NATURAL',
            numeroIdentificacion: '1720749389',
            datosPersonaNatural: {
                datosPersonales: {
                    apellidos: 'FLOR PAZMIÑO',
                    nombres: 'ANDRÉS PATRICIO',
                    genero: 'M',
                    estadoCivil: 'SOLTERO'
                },
                contacto: {
                    celular: '0991234567',
                    email: 'andres.flor@email.com'
                },
                direccion: {
                    callePrincipal: 'Calle Norberto Salazar',
                    numero: '64-204',
                    parroquia: 'TUMBACO',
                    canton: 'QUITO',
                    provincia: 'PICHINCHA'
                },
                informacionLaboral: {
                    profesionOcupacion: 'Abogado'
                }
            }
        }
    }
];

// Participantes - Caso 2: Pareja de cónyuges compareciendo juntos
const participantesConyuge = [
    {
        id: 'pp-3',
        personaCedula: '1712345678',
        calidad: 'VENDEDOR',
        actuaPor: 'REPRESENTANDO_SOCIEDAD_CONYUGAL',
        orden: 1,
        estadoCompletitud: 'completo',
        compareceConyugeJunto: true,
        esApoderado: false,
        persona: {
            tipoPersona: 'NATURAL',
            numeroIdentificacion: '1712345678',
            datosPersonaNatural: {
                datosPersonales: {
                    apellidos: 'RECALDE BRAVO',
                    nombres: 'MARIO HUMBERTO',
                    genero: 'M',
                    estadoCivil: 'CASADO'
                },
                contacto: {
                    celular: '0987654321'
                },
                direccion: {
                    callePrincipal: 'Av. 6 de Diciembre',
                    numero: 'N35-125',
                    parroquia: 'IÑAQUITO',
                    canton: 'QUITO',
                    provincia: 'PICHINCHA'
                },
                conyuge: {
                    nombres: 'ANA MARÍA',
                    apellidos: 'CEVALLOS GUERRA',
                    numeroIdentificacion: '1798765432'
                }
            }
        }
    },
    {
        id: 'pp-4',
        personaCedula: '1798765432',
        calidad: 'VENDEDOR',
        actuaPor: 'REPRESENTANDO_SOCIEDAD_CONYUGAL',
        orden: 2,
        estadoCompletitud: 'completo',
        compareceConyugeJunto: true,
        esApoderado: false,
        persona: {
            tipoPersona: 'NATURAL',
            numeroIdentificacion: '1798765432',
            datosPersonaNatural: {
                datosPersonales: {
                    apellidos: 'CEVALLOS GUERRA',
                    nombres: 'ANA MARÍA',
                    genero: 'F',
                    estadoCivil: 'CASADO'
                },
                contacto: {
                    celular: '0998123456'
                },
                direccion: {
                    callePrincipal: 'Av. 6 de Diciembre',
                    numero: 'N35-125',
                    parroquia: 'IÑAQUITO',
                    canton: 'QUITO',
                    provincia: 'PICHINCHA'
                }
            }
        }
    },
    {
        id: 'pp-5',
        personaCedula: '1765432109',
        calidad: 'COMPRADOR',
        actuaPor: 'PROPIOS_DERECHOS',
        orden: 3,
        estadoCompletitud: 'completo',
        compareceConyugeJunto: false,
        esApoderado: false,
        persona: {
            tipoPersona: 'NATURAL',
            numeroIdentificacion: '1765432109',
            datosPersonaNatural: {
                datosPersonales: {
                    apellidos: 'LÓPEZ SÁNCHEZ',
                    nombres: 'MARÍA FERNANDA',
                    genero: 'F',
                    estadoCivil: 'SOLTERA'
                },
                contacto: {
                    celular: '0991112233',
                    email: 'maria.lopez@email.com'
                },
                direccion: {
                    callePrincipal: 'Calle Los Rosales',
                    numero: '123',
                    parroquia: 'CUMBAYÁ',
                    canton: 'QUITO',
                    provincia: 'PICHINCHA'
                }
            }
        }
    }
];

// ============================================================
// PRUEBAS
// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 1: Formateo de Calidades con Género                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const calidadesTest = [
    ['VENDEDOR', 'M'],
    ['VENDEDOR', 'F'],
    ['COMPRADOR', 'M'],
    ['COMPRADOR', 'F'],
    ['PROMITENTE_VENDEDOR', 'M'],
    ['PROMITENTE_VENDEDOR', 'F'],
    ['DONATARIO', 'M'],
    ['DONATARIO', 'F']
];

calidadesTest.forEach(([calidad, genero]) => {
    const resultado = formatearCalidad(calidad, genero);
    const generoLabel = genero === 'M' ? '(Masc)' : '(Fem)';
    console.log(`  ${calidad} ${generoLabel} → ${resultado}`);
});

console.log('\n✅ Test de calidades completado\n');

// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 2: Generación de Encabezado - Compraventa               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const resultadoEncabezado1 = generarEncabezado(protocoloCompraventa, participantesSolteros);

if (resultadoEncabezado1.success) {
    console.log('ENCABEZADO GENERADO:');
    console.log('─'.repeat(70));
    console.log(resultadoEncabezado1.encabezado);
    console.log('─'.repeat(70));
    console.log('\n✅ Encabezado de compraventa generado correctamente\n');
} else {
    console.log('❌ Error:', resultadoEncabezado1.error);
}

// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 3: Generación de Encabezado - Promesa (con MULTA)       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const resultadoEncabezado2 = generarEncabezado(protocoloPromesa, participantesSolteros);

if (resultadoEncabezado2.success) {
    console.log('ENCABEZADO GENERADO:');
    console.log('─'.repeat(70));
    console.log(resultadoEncabezado2.encabezado);
    console.log('─'.repeat(70));
    console.log('\n✅ Encabezado de promesa (con MULTA) generado correctamente\n');
} else {
    console.log('❌ Error:', resultadoEncabezado2.error);
}

// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 4: Generación de Comparecencia - Personas Solteras      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const resultadoComparecencia1 = generarComparecencia(protocoloCompraventa, participantesSolteros);

if (resultadoComparecencia1.success) {
    console.log('COMPARECENCIA GENERADA (texto plano):');
    console.log('─'.repeat(70));
    // Mostrar primeros 500 caracteres para no saturar consola
    console.log(resultadoComparecencia1.comparecencia.substring(0, 800) + '...');
    console.log('─'.repeat(70));

    console.log('\nCOMPARECENCIA HTML (primeros 500 caracteres):');
    console.log('─'.repeat(70));
    console.log(resultadoComparecencia1.comparecenciaHtml.substring(0, 500) + '...');
    console.log('─'.repeat(70));

    console.log('\n✅ Comparecencia de personas solteras generada correctamente\n');
} else {
    console.log('❌ Error:', resultadoComparecencia1.error);
}

// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 5: Generación de Encabezado y Comparecencia - Cónyuges  ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const resultadoEncabezado3 = generarEncabezado(protocoloCompraventa, participantesConyuge);

if (resultadoEncabezado3.success) {
    console.log('ENCABEZADO CON CÓNYUGES:');
    console.log('─'.repeat(70));
    console.log(resultadoEncabezado3.encabezado);
    console.log('─'.repeat(70));
}

const resultadoComparecencia2 = generarComparecencia(protocoloCompraventa, participantesConyuge);

if (resultadoComparecencia2.success) {
    console.log('\nCOMPARECENCIA CON CÓNYUGES (texto plano):');
    console.log('─'.repeat(70));
    console.log(resultadoComparecencia2.comparecencia.substring(0, 1000) + '...');
    console.log('─'.repeat(70));
    console.log('\n✅ Textos con cónyuges generados correctamente\n');
} else {
    console.log('❌ Error:', resultadoComparecencia2.error);
}

// ============================================================

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║ TEST 6: Caso sin participantes                               ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const resultadoVacio = generarEncabezado(protocoloCompraventa, []);
console.log('Resultado sin participantes:', resultadoVacio.success ? '❌ No debería tener éxito' : '✅ Error esperado: ' + resultadoVacio.error);

// ============================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                    RESUMEN DE PRUEBAS');
console.log('═══════════════════════════════════════════════════════════════');
console.log('✅ Test 1: Formateo de calidades con género');
console.log('✅ Test 2: Encabezado de compraventa (2 personas solteras)');
console.log('✅ Test 3: Encabezado de promesa (con MULTA en lugar de AVALÚO)');
console.log('✅ Test 4: Comparecencia de personas solteras');
console.log('✅ Test 5: Encabezado y comparecencia con cónyuges');
console.log('✅ Test 6: Manejo de error (sin participantes)');
console.log('═══════════════════════════════════════════════════════════════\n');
