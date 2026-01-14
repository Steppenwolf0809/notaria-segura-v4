/**
 * Script de prueba para el servicio de conversión notarial
 * Ejecutar con: node scripts/test-notarial-conversion.js
 */

import {
    convertirNumeroALetras,
    convertirFechaNotarial,
    expandirAbreviaturasDireccion,
    formatearDireccionNotarial,
    formatearTelefonoNotarial,
    formatearDineroNotarial
} from '../backend/src/services/notarial-text-service.js';

console.log('='.repeat(80));
console.log(' TEST: Servicio de Conversión Notarial');
console.log('='.repeat(80));

console.log('\n📋 1. CONVERSIÓN DE CÉDULAS (dígito por dígito)');
console.log('-'.repeat(80));
const cedulas = ['1700936170', '1720749389', '0603123340', '1712345678'];
cedulas.forEach(cedula => {
    console.log(`IN:  ${cedula}`);
    console.log(`OUT: ${convertirNumeroALetras(cedula, 'cedula')}`);
    console.log('');
});

console.log('\n📞 2. CONVERSIÓN DE TELÉFONOS (dígito por dígito)');
console.log('-'.repeat(80));
const telefonos = ['022370289', '0984015618', '0987654321'];
telefonos.forEach(tel => {
    console.log(`IN:  ${tel}`);
    console.log(`OUT: ${formatearTelefonoNotarial(tel)}`);
    console.log('');
});

console.log('\n🏠 3. CONVERSIÓN DE NÚMEROS DE CASA/DIRECCIONES');
console.log('-'.repeat(80));
const numeroCasas = ['1115', 'N70-294', '27', '64-204', 'N35-42'];
numeroCasas.forEach(num => {
    console.log(`IN:  ${num}`);
    console.log(`OUT: ${convertirNumeroALetras(num, 'direccion')}`);
    console.log('');
});

console.log('\n💰 4. CONVERSIÓN DE DINERO');
console.log('-'.repeat(80));
const montos = [171150.80, 134876.06, 50000.00, 15000.50];
montos.forEach(monto => {
    console.log(`IN:  $${monto}`);
    console.log(`OUT: ${formatearDineroNotarial(monto)}`);
    console.log('');
});

console.log('\n📅 5. CONVERSIÓN DE FECHAS');
console.log('-'.repeat(80));
const fechas = [
    new Date('2025-09-03'),
    new Date('2025-11-21'),
    new Date('2026-01-14')
];
fechas.forEach(fecha => {
    console.log(`IN:  ${fecha.toISOString().split('T')[0]}`);
    console.log(`OUT: ${convertirFechaNotarial(fecha)}`);
    console.log('');
});

console.log('\n🔤 6. EXPANSIÓN DE ABREVIATURAS');
console.log('-'.repeat(80));
const abreviaturas = [
    'av. González Suárez',
    'calle Norberto Salazar nro. 1115',
    'Urb. La Primavera mz. 10 lt. 5',
    'edif. Torre del Sol dept. 302'
];
abreviaturas.forEach(texto => {
    console.log(`IN:  ${texto}`);
    console.log(`OUT: ${expandirAbreviaturasDireccion(texto)}`);
    console.log('');
});

console.log('\n🗺️  7. DIRECCIÓN COMPLETA NOTARIAL');
console.log('-'.repeat(80));
const direcciones = [
    {
        callePrincipal: 'calle Norberto Salazar',
        numero: '1115',
        calleSecundaria: 'Vicente Álvarez',
        parroquia: 'TUMBACO',
        canton: 'QUITO',
        provincia: 'PICHINCHA'
    },
    {
        callePrincipal: 'av. 6 de Diciembre',
        numero: 'N70-294',
        calleSecundaria: 'calle Whymper',
        parroquia: 'IÑAQUITO',
        canton: 'QUITO',
        provincia: 'PICHINCHA'
    }
];
direcciones.forEach((dir, index) => {
    console.log(`DIRECCIÓN ${index + 1}:`);
    console.log(formatearDireccionNotarial(dir));
    console.log('');
});

console.log('='.repeat(80));
console.log(' ✅ TESTS COMPLETADOS');
console.log('='.repeat(80));
