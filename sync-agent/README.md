# Koinor Sync Agent

Agente de sincronización que lee estados de facturación desde SQL Server (Koinor) y los envía al backend de Notaría Segura en Railway.

## Requisitos

- Node.js 18+
- SQL Server 2012 con la VIEW `dbo.v_estado_facturas` creada en `kdbs_notaria18`
- Acceso de red al servidor Railway

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con las credenciales reales
```

## Uso

```bash
# Ejecutar una sola sincronización (prueba)
npm run sync-once

# Ejecutar como proceso continuo
npm start

# Instalar como servicio Windows
npm run install-service

# Desinstalar servicio Windows
npm run uninstall-service
```

## Configuración

Todas las variables se configuran en `.env`. Ver `.env.example` para la lista completa.

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| KOINOR_SERVER | Si | - | Servidor SQL Server |
| KOINOR_DATABASE | Si | - | Base de datos Koinor |
| KOINOR_USER | Si | - | Usuario SQL Server |
| KOINOR_PASSWORD | Si | - | Contraseña SQL Server |
| RAILWAY_SYNC_URL | Si | - | URL del endpoint de sync |
| SYNC_API_KEY | Si | - | API Key para autenticación |
| KOINOR_PORT | No | 1433 | Puerto SQL Server |
| SYNC_INTERVAL_MINUTES | No | 10 | Intervalo entre sincronizaciones |
| SYNC_ACTIVE_HOUR_START | No | 8 | Hora inicio horario activo |
| SYNC_ACTIVE_HOUR_END | No | 18 | Hora fin horario activo |
| BATCH_SIZE | No | 500 | Registros por lote |
| LOG_LEVEL | No | info | Nivel de log (error/warn/info/debug) |

## Logs

Los logs se escriben en `logs/` con rotación diaria y retención de 30 días.
