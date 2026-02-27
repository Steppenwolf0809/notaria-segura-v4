import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL no esta configurada.');
    process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
    const documentId = '79b2299d-f9a9-4d9f-bb2e-d7de68e72f71';

    console.log(`Checking document: ${documentId}`);

    try {
        const document = await prisma.document.findUnique({
            where: { id: documentId },
            include: {
                events: true,
                createdBy: true,
                assignedTo: true
            }
        });

        if (!document) {
            console.log('âŒ Document not found!');
        } else {
            console.log('âœ… Document found:');
            console.log(JSON.stringify(document, null, 2));

            console.log(`\nEvents found: ${document.events.length}`);
            if (document.events.length === 0) {
                console.log('âš ï¸ No events found for this document.');

                // Let's check if there are ANY events for this user or generic checks
                // Checking if there are orphan events that might have lost the link (unlikely with FK, but possible if optional)
                // In the schema: document Document? @relation(fields: [documentId], references: [id], onDelete: Cascade)
                // documentId is optional?
                // model DocumentEvent { ... documentId String? ... }
                // Yes, documentId is optional.

                // Search for orphan events created around the time of the document
                console.log('Checking for potential orphan events around creation time...');
                const createdAt = document.createdAt;
                const timeWindowParams = {
                    gt: new Date(createdAt.getTime() - 1000 * 60 * 5), // 5 mins before
                    lt: new Date(createdAt.getTime() + 1000 * 60 * 5)  // 5 mins after
                };

                const nearbyEvents = await prisma.documentEvent.findMany({
                    where: {
                        createdAt: timeWindowParams,
                        userId: document.createdById
                    }
                });

                console.log(`Found ${nearbyEvents.length} events for user ${document.createdById} around document creation time:`);
                console.log(JSON.stringify(nearbyEvents, null, 2));
            }
        }

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();`r`n