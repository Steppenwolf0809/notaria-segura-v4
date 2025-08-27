// Servicio stub para el watcher de XML en producción/servidor
// En esta implementación, el watcher está deshabilitado por defecto.
// Si en el futuro se requiere activar, usar la variable de entorno XML_WATCHER_ENABLED=true

let isRunning = false;

function start() {
  const enabled = process.env.XML_WATCHER_ENABLED === 'true';

  if (!enabled) {
    console.log('ℹ️ XML Watcher deshabilitado (XML_WATCHER_ENABLED != true).');
    isRunning = false;
    return;
  }

  // Aquí iría la lógica real del watcher si se habilita en algún momento
  // Por ahora sólo dejamos un stub seguro
  isRunning = true;
  console.log('🟢 XML Watcher iniciado (modo stub).');
}

async function stop() {
  if (!isRunning) {
    return;
  }
  // Cierre ordenado del watcher si estuviera activo
  isRunning = false;
  console.log('🛑 XML Watcher detenido.');
}

export default { start, stop };


