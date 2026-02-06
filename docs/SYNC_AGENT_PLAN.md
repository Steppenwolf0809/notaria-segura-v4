# Koinor Sync Agent - Plan de Implementación (Parte 2)

## ✅ Parte 1 Completada (Railway Endpoint)

El endpoint en Railway está listo y desplegado:

| Endpoint | Método | URL |
|----------|--------|-----|
| Sync Billing | POST | `https://notaria-segura-production.up.railway.app/api/sync/billing` |
| Status | GET | `https://notaria-segura-production.up.railway.app/api/sync/billing/status` |
| History | GET | `https://notaria-segura-production.up.railway.app/api/sync/billing/history` |

**API Key:** `ns_sync_5468883cebb118f266c21fe81a5925e58e996191c294553f`

> ⚠️ **Acción Pendiente:** Configurar `SYNC_API_KEY` en Railway Dashboard → Variables

---

## 🎯 Parte 2: Sync Agent (Servidor Local Notaría)

### Objetivo
Crear un agente Node.js que:
1. Lea la VIEW `vw_facturas_railway` de SQL Server (Koinor)
2. Envíe los datos al endpoint de Railway cada 15 minutos
3. Funcione como servicio de Windows

### Arquitectura
```
┌─────────────────────────┐         HTTPS POST          ┌──────────────────┐
│   Servidor Notaría      │  ─────────────────────────▶ │   Railway        │
│   (Sync Agent Node.js)  │                             │   PostgreSQL     │
│          ↑              │  ◀─────────────────────────  │                  │
│   SQL Server (Koinor)   │      JSON Response          └──────────────────┘
└─────────────────────────┘
```

### Estructura Propuesta
```
sync-agent/
├── package.json
├── .env                    # Credenciales SQL Server + API Key
├── src/
│   ├── index.js            # Entry point, scheduler
│   ├── koinor-reader.js    # Conexión SQL Server, lee VIEW
│   ├── railway-sender.js   # POST a Railway endpoint
│   └── logger.js           # Logging con rotación
├── install-service.js      # Instalar como servicio Windows
└── logs/
```

### Variables de Entorno Requeridas (.env)
```env
# SQL Server (Koinor)
KOINOR_SERVER=localhost
KOINOR_DATABASE=KoinorDB
KOINOR_USER=sync_user
KOINOR_PASSWORD=xxxxx
KOINOR_PORT=1433

# Railway Endpoint
RAILWAY_SYNC_URL=https://notaria-segura-production.up.railway.app/api/sync/billing
SYNC_API_KEY=ns_sync_5468883cebb118f266c21fe81a5925e58e996191c294553f

# Configuración
SYNC_INTERVAL_MINUTES=15
```

### VIEW SQL Server Requerida
```sql
CREATE VIEW vw_facturas_railway AS
SELECT 
    numtra AS numero_factura,
    codcli AS cliente_cedula,
    nomcli AS cliente_nombre,
    fecemi AS fecha_emision,
    fecven AS fecha_vencimiento,
    valcob AS total_factura,
    observ AS numero_protocolo,    -- Número de protocolo para linking
    conpag AS condicion_pago,      -- 'E' o 'C'
    -- Desglose de pagos...
    CASE WHEN saldo = 0 THEN 'PAGADA' 
         WHEN pagado > 0 THEN 'PARCIAL' 
         ELSE 'PENDIENTE' END AS estado_pago,
    ultima_modificacion
FROM facturas
WHERE fecemi >= DATEADD(YEAR, -2, GETDATE());
```

### Dependencias npm
```json
{
  "dependencies": {
    "mssql": "^10.0.0",
    "node-fetch": "^3.3.0",
    "node-schedule": "^2.1.0",
    "dotenv": "^16.0.0",
    "winston": "^3.8.0",
    "node-windows": "^1.0.0-beta.8"
  }
}
```

---

## 📋 Checklist Parte 2

- [ ] Crear proyecto `sync-agent` en carpeta del servidor notaría
- [ ] Configurar conexión a SQL Server
- [ ] Crear VIEW en Koinor (o confirmar que existe)
- [ ] Implementar lector de datos (`koinor-reader.js`)
- [ ] Implementar enviador a Railway (`railway-sender.js`)
- [ ] Configurar scheduler (cada 15 min)
- [ ] Instalar como servicio Windows
- [ ] Probar sincronización completa

---

## 🧪 Test del Endpoint

Una vez configurada la API Key en Railway:
```bash
curl -X GET "https://notaria-segura-production.up.railway.app/api/sync/billing/status" \
  -H "X-Sync-Api-Key: ns_sync_5468883cebb118f266c21fe81a5925e58e996191c294553f"
```

Respuesta esperada:
```json
{"success":true,"data":{"lastSync":null,"syncHealthy":false}}
```
