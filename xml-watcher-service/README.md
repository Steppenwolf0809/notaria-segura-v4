XML Watcher Service - Notaría

Servicio standalone para Windows que monitorea una carpeta, sube XMLs a la API y organiza archivos con limpieza automática.

Uso rápido
- Configura `config.json` (usa la URL de producción `https://notaria-segura-v4-production.up.railway.app/api`).
- Construye el ejecutable:
```bash
cd xml-watcher-service
npm install
node build-exe.js
```
- Ejecuta `dist/xml-service.exe` junto a `config.json`.

Instalar como servicio (NSSM)
1) `nssm install XmlWatcherService`
2) Path: `C:\ruta\dist\xml-service.exe`
3) Startup directory: carpeta con `config.json`
4) `nssm start XmlWatcherService`

Características
- Autenticación JWT con reintentos y re-login 401
- Monitoreo `.xml` con `chokidar` y espera de escritura
- Upload individual/lote (hasta 20)
- Mover a `processed/YYYY-MM-DD` o `errors/YYYY-MM-DD`
- Limpieza diaria 02:00 y compresión mensual
- Logs rotados por tamaño/fecha en la carpeta vigilada


