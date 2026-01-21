import { PrismaClient } from '@prisma/client';

// Use the provided production connection string
process.env.DATABASE_URL = 'postgresql://postgres:uXwrkbpPDVXrEngsRCMHdIKkOUDXipic@switchback.proxy.rlwy.net:25513/railway';

const prisma = new PrismaClient();

async function main() {
    const documentId = '79b2299d-f9a9-4d9f-bb2e-d7de68e72f71';
    console.log(`Checking document history logic for: ${documentId}`);

    try {
        // 1. Simulate getDocumentHistory controller logic
        const limit = 50;
        const offset = 0;

        const whereClause = {
            documentId: documentId
        };

        console.log('Executing findMany...');
        const events = await prisma.documentEvent.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip: parseInt(offset),
            take: parseInt(limit)
        });

        console.log(`Events retrieved: ${events.length}`);

        // 2. Simulate formatting logic (which might crash)
        console.log('Simulating formatting...');

        // helper function mapping (mock)
        const getEventTitle = (type, details) => type;
        const formatEventDescription = (ev) => ev.description;
        const getEventContextInfo = (ev) => [];
        const getEventIcon = (type) => 'icon';
        const getEventColor = (type) => 'color';

        const formattedEvents = events.map(event => {
            // Parsear el campo details si es un string JSON
            let parsedDetails = event.details;
            if (typeof event.details === 'string') {
                try {
                    parsedDetails = JSON.parse(event.details);
                } catch (e) {
                    console.warn(`⚠️ No se pudo parsear details para evento ${event.id}:`, e);
                    parsedDetails = {};
                }
            }

            const eventWithParsedDetails = {
                ...event,
                details: parsedDetails
            };

            // Check if user is null (this is where it might crash if logic assumes user exists)
            if (!event.user) {
                console.error(`CRITICAL: Event ${event.id} has NO USER relation! userId: ${event.userId}`);
            }

            return {
                id: event.id,
                type: event.eventType,
                title: getEventTitle(event.eventType, parsedDetails),
                description: event.description,
                timestamp: event.createdAt,
                user: {
                    id: event.user.id, // This would throw if event.user is null
                    name: `${event.user.firstName} ${event.user.lastName}`,
                    role: event.user.role
                }
            };
        });

        console.log('Formatting successful!');
        console.log(JSON.stringify(formattedEvents, null, 2));

    } catch (error) {
        console.error('❌ CRASH DETECTED:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
