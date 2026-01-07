# XML Watcher Service - Notaría

Servicio standalone para Windows que monitorea una carpeta, sube XMLs a la API y organiza archivos con limpieza automática.

## Uso rápido
1. Configura `config.json` (usa la URL de producción `https://notaria-segura-v4-production.up.railway.app/api`).
2. Construye el ejecutable:
```bash
cd xml-watcher-service
npm install
node build-exe.js
```
3. Ejecuta `dist/xml-service.exe` junto a `config.json`.

## Despliegue con PM2 (Recomendado)
```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar servicio
cd C:\notaria-segura\xml-watcher-service
npm install
pm2 start ecosystem.config.js

# Guardar configuración y habilitar inicio automático
pm2 save
pm2-startup install
```

## Instalar como servicio (NSSM - Alternativo)
1) `nssm install XmlWatcherService`
2) Path: `C:\ruta\dist\xml-service.exe`
3) Startup directory: carpeta con `config.json`
4) `nssm start XmlWatcherService`

## Características
- **Filtrado de Facturas**: Solo procesa archivos con etiqueta `<factura>`. Notas de Crédito/Débito se mueven a `ignored/`.
- Autenticación JWT con reintentos y re-login 401
- Monitoreo `.xml` con `chokidar` y espera de escritura
- Upload individual/lote (hasta 20)
- Mover a `processed/YYYY-MM-DD`, `errors/YYYY-MM-DD` o `ignored/YYYY-MM-DD`
- Limpieza diaria 02:00 y compresión mensual
- Logs rotados por tamaño/fecha en la carpeta vigilada

## Carpetas
| Carpeta | Descripción |
|---------|-------------|
| `watch` | Carpeta vigilada para nuevos XMLs |
| `processed` | Facturas subidas exitosamente |
| `errors` | Archivos con errores de subida |
| `ignored` | Notas de Crédito y otros documentos no-factura |
| `archived` | Archivos comprimidos mensualmente |
