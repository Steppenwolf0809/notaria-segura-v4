import { db as prisma } from '../src/db.js';

async function checkDocument() {
  try {
    const doc = await prisma.document.findUnique({
      where: { protocolNumber: '20261701018C00097' },
      select: { 
        id: true,
        protocolNumber: true, 
        numeroFactura: true, 
        fechaFactura: true, 
        createdAt: true 
      }
    });
    console.log('Documento encontrado:');
    console.log(JSON.stringify(doc, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDocument();
