// Script para analizar la estructura del XML CXC
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'docs', 'cxc 20260128 (1).xml');

// Leer como UTF-16LE
const buffer = fs.readFileSync(filePath);
let xmlString = buffer.toString('utf16le');

// Remover BOM
xmlString = xmlString.replace(/^\uFEFF/, '').replace(/^\uFFFE/, '');

// Mostrar primeros 3000 caracteres
console.log('=== PRIMEROS 3000 CARACTERES ===');
console.log(xmlString.substring(0, 3000));

console.log('\n=== ANÁLISIS DE TAGS ===');

// Buscar todos los tags únicos
const tagMatches = xmlString.match(/<[^/][^>]*>/g);
const uniqueTags = [...new Set(tagMatches?.map(t => t.replace(/<([^\s>]+).*/, '$1')) || [])];
console.log('Tags únicos encontrados:', uniqueTags.slice(0, 30));

// Buscar patrón de row
const rowPattern = xmlString.match(/<([^>]*_row)>/);
console.log('\nPatrón de row:', rowPattern ? rowPattern[1] : 'No encontrado');

// Buscar patrón de group
const groupPattern = xmlString.match(/<([^>]*_group\d*)>/);
console.log('Patrón de group:', groupPattern ? groupPattern[1] : 'No encontrado');

// Contar ocurrencias
const rowCount = (xmlString.match(/<cxc_\d+_row>/g) || []).length;
const groupCount = (xmlString.match(/<cxc_\d+_group1>/g) || []).length;
console.log(`\nRows encontrados: ${rowCount}`);
console.log(`Groups encontrados: ${groupCount}`);

// Extraer un ejemplo de row completo
const rowExample = xmlString.match(/<cxc_\d+_row>[\s\S]*?<\/cxc_\d+_row>/);
if (rowExample) {
    console.log('\n=== EJEMPLO DE UN ROW COMPLETO ===');
    console.log(rowExample[0].substring(0, 2000));
}
