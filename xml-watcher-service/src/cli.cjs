#!/usr/bin/env node
// Wrapper CommonJS para cargar el entrypoint ESM
(async () => {
  await import('./index.js');
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fallo al iniciar el servicio:', err);
  process.exit(1);
});


