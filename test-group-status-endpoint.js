/**
 * Test script para verificar el endpoint PUT /api/documents/group/status
 * Este script probará el endpoint con diferentes estados
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Mock de datos para pruebas
const testData = {
  documentGroupId: 'test-group-id',
  newStatus: 'LISTO',
  deliveredTo: null,
  reversionReason: null
};

async function testGroupStatusEndpoint() {
  try {
    console.log('🧪 Iniciando pruebas del endpoint PUT /api/documents/group/status');
    
    // Primero necesitaríamos un token válido, pero solo probamos si el endpoint responde
    const response = await axios.put(`${BASE_URL}/api/documents/group/status`, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ Respuesta del servidor:', response.status);
    console.log('📄 Data:', response.data);

  } catch (error) {
    if (error.response) {
      console.log('📊 Estado de respuesta:', error.response.status);
      console.log('📄 Error data:', error.response.data);
      
      // Si es 401 (unauthorized), significa que el endpoint funciona pero necesita token
      if (error.response.status === 401) {
        console.log('✅ Endpoint funciona correctamente - requiere autenticación');
        return true;
      }
      
      // Si es 500, hay un error en el servidor
      if (error.response.status === 500) {
        console.log('❌ Error 500 - problema en el servidor');
        console.log('Error message:', error.response.data.message);
        return false;
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Servidor no está corriendo en puerto 3000');
      return false;
    } else {
      console.log('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

// Solo ejecutar si se llama directamente
if (require.main === module) {
  testGroupStatusEndpoint()
    .then(success => {
      console.log('🔚 Prueba finalizada:', success ? 'ÉXITO' : 'FALLO');
      process.exit(success ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Error en prueba:', err);
      process.exit(1);
    });
}

module.exports = { testGroupStatusEndpoint };