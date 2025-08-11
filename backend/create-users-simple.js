#!/usr/bin/env node

/**
 * SCRIPT SIMPLE PARA CREAR USUARIOS VIA API
 * Funciona con el servidor ya ejecutándose
 */

const usuarios = [
  { email: 'admin@notaria.com', password: 'Notaria123.', firstName: 'Jose Luis', lastName: 'Zapata', role: 'ADMIN' },
  { email: 'cindy.pazmino@notaria.com', password: 'Notaria123.', firstName: 'Cindy', lastName: 'Pazmiño Naranjo', role: 'CAJA' },
  { email: 'mayra.corella@notaria.com', password: 'Notaria123.', firstName: 'Mayra Cristina', lastName: 'Corella Parra', role: 'MATRIZADOR' },
  { email: 'karol.velastegui@notaria.com', password: 'Notaria123.', firstName: 'Karol Daniela', lastName: 'Velastegui Cadena', role: 'MATRIZADOR' },
  { email: 'jose.zapata@notaria.com', password: 'Notaria123.', firstName: 'Jose Luis', lastName: 'Zapata Silva', role: 'MATRIZADOR' },
  { email: 'gissela.velastegui@notaria.com', password: 'Notaria123.', firstName: 'Gissela Vanessa', lastName: 'Velastegui Cadena', role: 'MATRIZADOR' },
  { email: 'francisco.proano@notaria.com', password: 'Notaria123.', firstName: 'Francisco Esteban', lastName: 'Proaño Astudillo', role: 'MATRIZADOR' },
  { email: 'karolrecepcion@notaria.com', password: 'Notaria123.', firstName: 'Karol', lastName: 'Velastegui', role: 'RECEPCION' },
  { email: 'maria.diaz@notaria.com', password: 'Notaria123.', firstName: 'Maria Lucinda', lastName: 'Diaz Pilatasig', role: 'ARCHIVO' }
];

async function crearUsuarios() {
  console.log('🚀 CREANDO USUARIOS VIA API');
  console.log('============================\n');
  
  for (const user of usuarios) {
    try {
      console.log(`👤 Creando: ${user.firstName} ${user.lastName} (${user.role})`);
      
      const response = await fetch('http://localhost:3001/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(`   ✅ Creado exitosamente`);
      } else {
        console.log(`   ❌ Error: ${result.message}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n✨ Proceso completado!');
  console.log('\n🧪 Prueba login con:');
  console.log('admin@notaria.com / Notaria123.');
}

crearUsuarios();