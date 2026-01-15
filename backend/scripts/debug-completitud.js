
import { PrismaClient } from '@prisma/client';
import { calcularCompletitudPersonaNatural } from '../src/services/completitud-service.js';

const prisma = new PrismaClient();

async function debugCompletitud() {
    try {
        console.log('Buscando a Mauricio Quinga...');

        // Buscar por nombre aproximado en JSON
        // Nota: Prisma no soporta búsqueda profunda en JSON fácilmente en SQLite/Postgres sin extensiones a veces,
        // pero intentaremos buscar en PersonaRegistrada

        // Primero intentamos buscar coincidencias si tuvieramos un campo de texto plano, 
        // pero como está en JSON, mejor traemos algunos y filtramos en memoria (si no son muchos)
        // O mejor, buscamos por ID si el usuario lo proporcionó en la imagen.
        // La imagen muestra: 1715374151 - VENDEDOR

        const cedula = '1715374151';
        console.log(`Buscando cédula: ${cedula}`);

        const persona = await prisma.personaRegistrada.findUnique({
            where: { numeroIdentificacion: cedula }
        });

        if (!persona) {
            console.log('Persona no encontrada con esa cédula.');
            return;
        }

        console.log('--- DATOS CRUDOS ---');
        console.log(JSON.stringify(persona.datosPersonaNatural, null, 2));

        console.log('\n--- CÁLCULO DE COMPLETITUD ---');
        const resultado = calcularCompletitudPersonaNatural(persona);
        console.log(JSON.stringify(resultado, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugCompletitud();
