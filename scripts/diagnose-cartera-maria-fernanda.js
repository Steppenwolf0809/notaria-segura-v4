const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  try {
    // Buscar facturas con clientName que contenga 'MARIA FERNANDA'
    const invoices = await prisma.invoice.findMany({
      where: {
        clientName: { contains: 'MARIA FERNANDA', mode: 'insensitive' }
      },
      include: {
        document: { select: { id: true, assignedToId: true, status: true, protocolNumber: true } },
        payments: true
      }
    });
    
    console.log('=== FACTURAS MARIA FERNANDA ===');
    console.log('Total facturas encontradas:', invoices.length);
    
    let totalBalance = 0;
    for (const inv of invoices) {
      const paid = inv.payments.reduce((s, p) => s + Number(p.amount), 0);
      const balance = Number(inv.totalAmount) - paid;
      totalBalance += balance;
      
      console.log({
        invoiceNumber: inv.invoiceNumber,
        clientTaxId: inv.clientTaxId,
        totalAmount: Number(inv.totalAmount),
        paid,
        balance,
        status: inv.status,
        hasDocument: !!inv.documentId,
        docProtocol: inv.document?.protocolNumber || 'N/A',
        docMatrizadorId: inv.document?.assignedToId || 'N/A',
        invoiceMatrizadorId: inv.assignedToId || 'N/A'
      });
    }
    
    console.log('\n=== RESUMEN ===');
    console.log('Total facturas:', invoices.length);
    console.log('Saldo total:', totalBalance.toFixed(2));
    
    // Buscar documentos con cliente MARIA FERNANDA
    console.log('\n=== DOCUMENTOS MARIA FERNANDA ===');
    const docs = await prisma.document.findMany({
      where: {
        clientName: { contains: 'MARIA FERNANDA', mode: 'insensitive' }
      },
      include: {
        invoices: true,
        assignedTo: { select: { firstName: true, lastName: true } }
      }
    });
    
    console.log('Total documentos:', docs.length);
    for (const doc of docs) {
      console.log({
        protocolNumber: doc.protocolNumber,
        clientName: doc.clientName,
        status: doc.status,
        matrizador: doc.assignedTo ? `${doc.assignedTo.firstName} ${doc.assignedTo.lastName}` : 'Sin asignar',
        facturas: doc.invoices.length
      });
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

diagnose().catch(console.error);
