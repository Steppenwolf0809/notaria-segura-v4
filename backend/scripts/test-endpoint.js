import { db as prisma } from '../src/db.js';

async function testEndpoint() {
  try {
    const document = await prisma.document.findUnique({
      where: { id: '2de964ea-8fe7-4c1c-8974-479a98ee5c3e' },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        invoices: {
          include: {
            payments: true
          }
        }
      }
    });
    
    // Simular lo que hace el endpoint
    const { invoices, ...documentWithoutInvoices } = document;
    
    console.log('Documento (como lo devuelve el endpoint):');
    console.log('  numeroFactura:', documentWithoutInvoices.numeroFactura);
    console.log('  fechaFactura:', documentWithoutInvoices.fechaFactura);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testEndpoint();
