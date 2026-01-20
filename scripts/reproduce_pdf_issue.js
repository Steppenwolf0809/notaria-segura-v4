import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseEscrituraPDF } from '../backend/src/services/pdf-parser-escrituras.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.resolve(__dirname, '../docs/ActoNotarial-49590671.pdf');

// Logic copied from service to safely load pdf-parse
async function getPdfParse() {
    try {
        const modDirect = await import('pdf-parse/lib/pdf-parse.js');
        return modDirect?.default || modDirect;
    } catch (_) {
        const mod = await import('pdf-parse');
        return mod?.default || mod;
    }
}

async function run() {
    try {
        console.log(`Reading PDF from: ${pdfPath}`);
        if (!fs.existsSync(pdfPath)) {
            console.error(`File not found: ${pdfPath}`);
            return;
        }
        const pdfBuffer = fs.readFileSync(pdfPath);

        // 1. Raw Text Extraction for Analysis
        const pdfParse = await getPdfParse();
        const data = await pdfParse(pdfBuffer);
        console.log('\n--- RAW TEXT START ---');
        console.log(data.text);
        console.log('--- RAW TEXT END ---\n');

        // 2. Parse using the service
        console.log('--- PARSING RESULT ---');
        const result = await parseEscrituraPDF(pdfBuffer, 'ActoNotarial-49590671.pdf');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

run();
