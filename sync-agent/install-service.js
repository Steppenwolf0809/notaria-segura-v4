import { Service } from 'node-windows';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, 'src', 'index.js');

const svc = new Service({
  name: 'Koinor Sync Agent',
  description: 'Sincroniza estados de facturación de Koinor a Notaría Segura',
  script: scriptPath,
  wait: 10,
  grow: 0.5,
  maxRestarts: 20,
});

svc.on('install', () => {
  console.log('Servicio instalado correctamente.');
  svc.start();
});

svc.on('start', () => {
  console.log('Servicio iniciado.');
});

svc.on('alreadyinstalled', () => {
  console.log('El servicio ya estaba instalado.');
});

svc.on('error', (err) => {
  console.error('Error:', err);
});

console.log('Instalando servicio "Koinor Sync Agent"...');
svc.install();
