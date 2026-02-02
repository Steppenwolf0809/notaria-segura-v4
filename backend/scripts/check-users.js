import { db } from '../src/db.js';

async function checkUsers() {
  console.log('Verificando usuarios MATRIZADOR...');
  
  try {
    const users = await db.user.findMany({
      where: { role: 'MATRIZADOR' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    });
    
    console.log('\n=== USUARIOS MATRIZADOR ===');
    users.forEach((u, i) => {
      const fullName = `${u.firstName} ${u.lastName}`;
      console.log(`${i+1}. ID: ${u.id} | "${fullName}" | email: ${u.email}`);
    });
    
    // Mostrar mapeo esperado vs real
    console.log('\n=== MAPEO CXC vs USUARIOS ===');
    const mapping = {
      'Mayra Corella': users.find(u => u.firstName.toLowerCase().includes('mayra')),
      'Karol Velastegui': users.find(u => u.firstName.toLowerCase().includes('karol')),
      'Jose Zapata': users.find(u => u.firstName.toLowerCase().includes('jose')),
      'Gissela Velastegui': users.find(u => u.firstName.toLowerCase().includes('gissela')),
      'Maria Diaz': users.find(u => u.firstName.toLowerCase().includes('maria'))
    };
    
    Object.entries(mapping).forEach(([cxcName, user]) => {
      if (user) {
        console.log(`  ✅ "${cxcName}" -> Usuario: "${user.firstName} ${user.lastName}" (ID: ${user.id})`);
      } else {
        console.log(`  ❌ "${cxcName}" -> NO ENCONTRADO`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkUsers();
