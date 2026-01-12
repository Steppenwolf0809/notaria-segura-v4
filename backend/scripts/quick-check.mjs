/**
 * Quick test - check production template
 */
import { PrismaClient } from '@prisma/client';

console.log('Starting...');
const prisma = new PrismaClient();

const t = await prisma.whatsAppTemplate.findFirst({
    where: { tipo: 'DOCUMENTO_LISTO', activo: true }
});

if (!t) {
    console.log('No template found');
    process.exit(1);
}

console.log('Template ID:', t.id);
console.log('Template titulo:', t.titulo);

// Check first chars and bytes
const msg = t.mensaje;
console.log('\nFirst 80 chars:');
console.log(msg.substring(0, 80));

// Check for emoji bytes
const buf = Buffer.from(msg, 'utf8');
console.log('\nFirst 20 bytes (hex):');
console.log(buf.slice(0, 20).toString('hex'));

// Expected: f09f8f9befb88f = 🏛️
const hasEmoji = buf[0] === 0xf0 && buf[1] === 0x9f;
console.log('\nStarts with emoji?:', hasEmoji);

await prisma.$disconnect();
console.log('\nDone');
