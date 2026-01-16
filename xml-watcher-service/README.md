# XML Watcher Service UNIFICADO - Notaría

Servicio standalone para Windows que:
1. **Vigila `C:\SRI\Comprobantes_generados`** - Copia XMLs a `xmlcopiados` antes de que el software de facturación los borre
2. **Procesa y sube XMLs** - Sube vía API al sistema de la notaría
3. **Detecta gaps en secuencias** - Muestra popup de alerta cuando falta un número (ej: p00098 → p00100)
4. **Corre en segundo plano** - Servicio de Windows con PM2

## Uso rápido
```bash
cd xml-watcher-service
npm install
node src/index.js
```

## Instalar como servicio con PM2 (Recomendado)
```bash
# Instalar PM2 y startup
npm install -g pm2
npm install -g pm2-windows-startup

# Habilitar inicio automático con Windows
pm2-startup install

# Iniciar servicio
cd C:\notaria-segura\xml-watcher-service
pm2 start ecosystem.config.js --name xml-watcher

# Guardar configuración
pm2 save
```

## Configuración (config.json)
```json
{
  "folders": {
    "source": "C:\\SRI\\Comprobantes_generados",
    "watch": "C:\\Users\\admlocal\\Desktop\\xmlcopiados"
  },
  "sourceWatcher": {
    "enabled": true,
    "copyDelay": 2000
  },
  "sequenceTracking": {
    "enabled": true,
    "alertPopup": true
  }
}
```

## Carpetas
| Carpeta | Descripción |
|---------|-------------|
| `source` | Carpeta SRI donde llegan los XMLs (vigilada) |
| `watch` | Carpeta intermedia donde se procesan |
| `processed` | Facturas subidas exitosamente |
| `errors` | Archivos con errores de subida |
| `ignored` | Notas de Crédito y otros documentos no-factura |

## Detección de Gaps
Cuando se detecta un salto en la secuencia:
- Se muestra un **popup de Windows** con los números faltantes
- Se registra en `sequence-gaps.log`
- El estado de secuencias se persiste en `sequence-state.json`

## Características
- Autenticación JWT con reintentos y re-login 401
- Monitoreo `.xml` con `chokidar` y espera de escritura
- Upload individual/lote (hasta 20)
- Filtrado de Notas de Crédito/Débito (van a `ignored/`)
- Limpieza diaria 02:00 y compresión mensual
- Logs rotados por tamaño/fecha
