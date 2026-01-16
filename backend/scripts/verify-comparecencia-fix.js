
import { generarComparecencia } from '../src/services/comparecencia-generator-service.js';

// Mock Data
const protocolo = {
    tipoActo: 'COMPRAVENTA',
    fecha: new Date('2026-01-14T10:00:00'),
    numeroProtocolo: '2026-18-001'
};

const mockPersona = (nombre, cedula, genero, estadoCivil, profesion, conyuge = null) => ({
    numeroIdentificacion: cedula,
    tipoPersona: 'NATURAL',
    datosPersonaNatural: {
        datosPersonales: {
            nombres: nombre.split(' ')[0],
            apellidos: nombre.split(' ').slice(1).join(' '),
            genero,
            estadoCivil
        },
        informacionLaboral: {
            profesionOcupacion: profesion
        },
        direccion: {
            callePrincipal: 'Calle 1',
            numero: '123',
            canton: 'QUITO',
            provincia: 'PICHINCHA'
        },
        conyuge: conyuge ? {
            nombres: conyuge.nombre.split(' ')[0],
            apellidos: conyuge.nombre.split(' ').slice(1).join(' '),
            numeroIdentificacion: conyuge.cedula
        } : null
    }
});

const participantes = [
    // 1. COMPRADOR (Ingresado Primero, debería salir al final)
    {
        id: 'p1',
        orden: 1,
        calidad: 'COMPRADOR',
        personaCedula: '1700000001',
        persona: mockPersona('JUAN PEREZ', '1700000001', 'M', 'SOLTERO', 'ARQUITECTO')
    },
    // 2. VENDEDOR ESPOSO (Ingresado Segundo)
    {
        id: 'p2',
        orden: 2,
        calidad: 'VENDEDOR',
        personaCedula: '1700000002',
        compareceConyugeJunto: true,
        persona: mockPersona('CARLOS LOPEZ', '1700000002', 'M', 'CASADO', 'INGENIERO', { nombre: 'MARIA RUIZ', cedula: '1700000003' })
    },
    // 3. VENDEDORA ESPOSA (Ingresada Tercera)
    {
        id: 'p3',
        orden: 3,
        calidad: 'VENDEDOR',
        personaCedula: '1700000003',
        compareceConyugeJunto: true,
        persona: mockPersona('MARIA RUIZ', '1700000003', 'F', 'CASADO', 'DOCTORA', { nombre: 'CARLOS LOPEZ', cedula: '1700000002' })
    },
    // 4. VENDEDOR DIVORCIADO (Ingresado Cuarto, debería agruparse con los vendedores)
    {
        id: 'p4',
        orden: 4,
        calidad: 'VENDEDOR',
        personaCedula: '1700000004',
        compareceConyugeJunto: false,
        persona: mockPersona('PEDRO SOTO', '1700000004', 'M', 'DIVORCIADO', 'ABOGADO')
    }
];

console.log('--- GENERANDO COMPARECENCIA ---');
const resultado = generarComparecencia(protocolo, participantes, { formatoHtml: true });

if (resultado.success) {
    console.log('\n--- TEXTO PLANO ---');
    console.log(resultado.comparecencia);

    console.log('\n--- HTML (FRAGMENTO) ---');
    console.log(resultado.comparecenciaHtml);

    // Validaciones
    console.log('\n--- VERIFICACIONES ---');

    const texto = resultado.comparecencia;

    // 1. Orden: Vendedores primero
    const idxVendedores = texto.toLowerCase().indexOf('vendedores');
    const idxComprador = texto.toLowerCase().indexOf('comprador');
    const idxJuanPerez = texto.indexOf('JUAN PEREZ');
    const idxCarlos = texto.indexOf('CARLOS LOPEZ');

    console.log('--- DEBUG INFO ---');
    console.log(`Index vendedores: ${idxVendedores}`);
    console.log(`Index comprador: ${idxComprador}`);
    console.log(`Index Juan Perez (Comprador): ${idxJuanPerez}`);
    console.log(`Index Carlos Lopez (Vendedor): ${idxCarlos}`);
    console.log(`Fecha Generada: ${resultado.comparecenciaHtml.match(/<strong>.*?2026.*?<\/strong>/)}`);

    console.log('Vendedores antes que Comprador?', idxCarlos < idxJuanPerez ? 'PASS' : 'FAIL');

    // 2. Pluralización Vendedores
    console.log('Dice "calidad de vendedores"?', texto.toLowerCase().includes('calidad de vendedores') ? 'PASS' : 'FAIL');

    // 3. Ocupación Esposa
    console.log('Incluye ocupación de Maria (doctora)?', texto.toLowerCase().includes('ocupación ingeniero y doctora') || texto.toLowerCase().includes('ocupación doctora') ? 'PASS' : 'FAIL');

    // 4. Negritas (HTML)
    // Ajustado para aceptar MIÉRCOLES con tilde o sin tilde regex
    console.log('Fecha en negrita?', /<strong>MI(É|E)RCOLES CATORCE \(14\) DE ENERO DEL DOS MIL VEINTISEIS \(2026\)<\/strong>/.test(resultado.comparecenciaHtml) ? 'PASS' : 'FAIL');
    console.log('Nombre Notaria en negrita?', resultado.comparecenciaHtml.includes('<strong>DOCTORA GLENDA ZAPATA SILVA, NOTARIA DÉCIMA OCTAVA DEL CANTÓN QUITO</strong>') ? 'PASS' : 'FAIL');
    console.log('Nombre Juan Perez en negrita?', resultado.comparecenciaHtml.includes('<strong>JUAN PEREZ</strong>') ? 'PASS' : 'FAIL');

    // 5. Domicilios Agrupados
    const domTexto = resultado.comparecenciaHtml.split('domiciliados en')[1];
    console.log('Domicilio cónyuges agrupado?', domTexto.includes('los cónyuges <strong>CARLOS LOPEZ</strong> y <strong>MARIA RUIZ</strong>') ? 'PASS' : 'FAIL');

} else {
    console.error('Error:', resultado.error);
}
