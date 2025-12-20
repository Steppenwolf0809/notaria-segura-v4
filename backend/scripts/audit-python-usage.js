import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// En los módulos modernos (ESM), __dirname no existe automáticamente, hay que crearlo:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const SEARCH_DIR = path.join(__dirname, '../src');
const SEARCH_TERMS = ['python-pdf-client', 'python', '.py'];
const IGNORE_DIRS = ['node_modules', '.git', 'coverage'];

function searchInDirectory(directory) {
    // Verificamos si el directorio existe antes de leerlo
    if (!fs.existsSync(directory)) {
        console.warn(`⚠️ Advertencia: El directorio ${directory} no existe.`);
        return [];
    }

    const files = fs.readdirSync(directory);
    let results = [];

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                results = results.concat(searchInDirectory(filePath));
            }
        } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const matches = [];

            SEARCH_TERMS.forEach(term => {
                if (content.toLowerCase().includes(term.toLowerCase())) {
                    matches.push(term);
                }
            });

            if (matches.length > 0) {
                results.push({
                    file: filePath.replace(SEARCH_DIR, ''),
                    matches: matches
                });
            }
        }
    }
    return results;
}

console.log('🔍 --- INICIANDO AUDITORÍA DE CÓDIGO (Buscando referencias a Python) ---');
console.log(`📂 Buscando en: ${SEARCH_DIR}`);

try {
    const findings = searchInDirectory(SEARCH_DIR);

    if (findings.length === 0) {
        console.log('✅ ¡BUENAS NOTICIAS! No se encontraron referencias activas a Python en el código fuente.');
        console.log('   Esto significa que es seguro eliminar el servicio de Python.');
    } else {
        console.log(`⚠️  SE ENCONTRARON ${findings.length} ARCHIVOS QUE PODRÍAN USAR PYTHON:`);
        findings.forEach(f => {
            console.log(`   📄 ${f.file} -> Contiene: [${f.matches.join(', ')}]`);
        });
        console.log('\n❌ Debes editar estos archivos y cambiar la lógica a Node.js antes de eliminar los archivos .py');
    }
} catch (error) {
    console.error('Error durante la auditoría:', error.message);
}