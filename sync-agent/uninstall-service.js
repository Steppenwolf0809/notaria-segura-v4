import { Service } from 'node-windows';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, 'src', 'index.js');

const svc = new Service({
  name: 'Koinor Sync Agent',
  script: scriptPath,
});

svc.on('uninstall', () => {
  console.log('Servicio desinstalado correctamente.');
});

svc.on('stop', () => {
  console.log('Servicio detenido.');
});

svc.on('error', (err) => {
  console.error('Error:', err);
});

console.log('Desinstalando servicio "Koinor Sync Agent"...');
svc.stop();
svc.uninstall();
