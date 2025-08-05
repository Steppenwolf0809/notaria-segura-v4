// Script simple para probar la conectividad con el backend
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/health',
  method: 'GET'
};

console.log('🔍 Probando conexión con backend REAL en puerto 3001...');

const req = http.request(options, (res) => {
  console.log(`✅ Respuesta del servidor: ${res.statusCode}`);
  console.log(`📡 Backend REAL está corriendo correctamente en puerto 3001`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📄 Respuesta:', data);
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error(`❌ Error de conexión: ${err.message}`);
  console.log('💡 Posibles causas:');
  console.log('   - Backend no está corriendo');
  console.log('   - Puerto incorrecto');
  console.log('   - Firewall bloqueando conexión');
  process.exit(1);
});

req.setTimeout(5000, () => {
  console.error('⏰ Timeout - El servidor no responde');
  req.abort();
  process.exit(1);
});

req.end();