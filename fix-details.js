const fs = require('fs');
const path = require('path');

const filePath = './backend/src/controllers/document-controller.js';
let content = fs.readFileSync(filePath, 'utf8');

// Regex para encontrar "details: {" que NO esté precedido por "JSON.stringify("
// y reemplazarlo con "details: JSON.stringify({"
// También encuentra el cierre correspondiente del objeto y agrega ")"

const lines = content.split('\n');
const result = [];
let inDetails = false;
let detailsStartLine = -1;
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Si encontramos "details: {" sin JSON.stringify
  if (line.includes('details: {') && !line.includes('JSON.stringify')) {
    // Reemplazar "details: {" con "details: JSON.stringify({"
    result.push(line.replace('details: {', 'details: JSON.stringify({'));
    inDetails = true;
    detailsStartLine = i;
    braceCount = 1; // Empezamos contando la llave que acabamos de abrir
  } else if (inDetails) {
    // Contar llaves para encontrar el cierre correcto
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    braceCount += openBraces - closeBraces;

    // Si el contador llega a 0, encontramos el cierre del objeto details
    if (braceCount === 0) {
      // Agregar paréntesis de cierre para JSON.stringify
      // Buscar el último "}" y agregar ")" después
      result.push(line.replace(/}(\s*,?\s*)$/, '})$1'));
      inDetails = false;
    } else {
      result.push(line);
    }
  } else {
    result.push(line);
  }
}

const newContent = result.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');

console.log('✅ Archivo corregido exitosamente');
console.log(`Total de líneas procesadas: ${lines.length}`);
