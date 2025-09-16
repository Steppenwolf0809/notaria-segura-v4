# 📋 Sistema de Generación de Concuerdos - Runbook

## 🎯 Visión General

El sistema de concuerdos es un generador automático de documentos notariales que combina extracción de datos con LLM (Gemini), plantillas base A/B/C, modificadores por familia de acto, y métricas de observabilidad.

### 🏗️ Arquitectura

```
PDF/Text → Gemini LLM → Estructura A/B/C → Templates Base → Mods por Familia → Concuerdo Final
```

## 🚀 Inicio Rápido

### 1. Configuración de Variables de Entorno

```bash
# Base de datos
DATABASE_URL="postgresql://..."

# Autenticación
JWT_SECRET="tu_jwt_secret_seguro"

# Gemini AI
GOOGLE_API_KEY="tu_api_key"
GEMINI_ENABLED=true
GEMINI_MODEL="gemini-1.5-flash"

# Configuración de concuerdos
TEMPLATE_MODE=family  # "family" o "structural"
PROMPT_FORCE_TEMPLATE=auto  # "auto", "A", "B", "C"
LLM_ROUTER_ENABLED=false
STRUCTURE_ROUTER_ENABLED=true
```

### 2. Instalación y Setup

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npm run db:generate

# Ejecutar migraciones
npm run db:migrate

# Poblar datos iniciales
npm run populate-users
```

### 3. Ejecutar QA y Validación

```bash
# Ejecutar tests de QA
npm run qa:concuerdos

# Ejecutar QA Gate (control de calidad)
npm run qa:gate

# Ver métricas en desarrollo
curl http://localhost:3001/api/concuerdos/metrics
```

## 📊 Endpoints Principales

### POST `/api/concuerdos/process`
- **Descripción**: Procesa texto completo y genera concuerdos PRIMERA/SEGUNDA
- **Autenticación**: JWT + Rol MATRIZADOR
- **Rate Limiting**: Sí (configurable)
- **Body**:
```json
{
  "text": "Texto completo del documento notarial..."
}
```
- **Respuesta**:
```json
{
  "success": true,
  "extraction": { /* datos extraídos */ },
  "concuerdos": {
    "primera": "Texto del concuerdo primera copia",
    "segunda": "Texto del concuerdo segunda copia",
    "estructura": "A",
    "audit": {
      "force": "auto",
      "templateMode": "family",
      "warnings": []
    }
  }
}
```

### GET `/api/concuerdos/metrics` (Desarrollo)
- **Descripción**: Métricas de observabilidad
- **Autenticación**: JWT + Rol MATRIZADOR
- **Disponibilidad**: Solo en `NODE_ENV !== 'production'`

## 🎨 Sistema de Templates

### Estructuras Base (A/B/C)

- **A**: Otorgante → Beneficiario (cuando hay beneficiarios o "a favor de")
- **B**: Solo otorgante (sin beneficiarios explícitos)
- **C**: Especial (actos específicos como autorización de salida, posesión efectiva)

### Modificadores por Familia

| Familia | Archivo | Descripción |
|---------|---------|-------------|
| Poderes | `mods/poderes.hbs` | Mandante/mandatario, representación |
| Transacciones | `mods/transacciones.hbs` | Vender/donar/ceder, cuantía |
| Hipotecas | `mods/hipotecas.hbs` | Acreedor hipotecario, bien |
| Autorizaciones | `mods/autorizaciones.hbs` | Hijo/hija, roles parentales |
| Reconocimientos | `mods/reconocimientos.hbs` | Documento reconocido |
| Genérico | `mods/generico.hbs` | Fallback para casos no clasificados |

### Variables de Template

```javascript
{
  numeroCopia: "PRIMERA", // o "SEGUNDA"
  acto: "PODER GENERAL",
  otorgantes_render: "Juan Pérez y María García",
  beneficiarios_render: "Carlos López",
  notarioNombre: "Dr. Juan Martínez",
  notariaNumero: "Décima Octava",
  // Variables específicas por familia...
}
```

## ⚙️ Configuración Avanzada

### Flags de Control

| Variable | Valores | Descripción |
|----------|---------|-------------|
| `TEMPLATE_MODE` | `family`/`structural` | Aplicar mods por familia |
| `PROMPT_FORCE_TEMPLATE` | `auto`/`A`/`B`/`C` | Forzar estructura específica |
| `LLM_ROUTER_ENABLED` | `true`/`false` | Habilitar router de estrategias LLM |
| `STRUCTURE_ROUTER_ENABLED` | `true`/`false` | Habilitar detección automática de estructura |

### Configuración de Rendimiento

```bash
# Timeouts
GEMINI_TIMEOUT=30000
GEMINI_MAX_RETRY_DELAY=10000

# Circuit Breaker
GEMINI_CIRCUIT_THRESHOLD=5
GEMINI_CIRCUIT_TIMEOUT=60000

# Cache de Templates
# TTL automático: 5 minutos
```

## 🔍 Monitoreo y Observabilidad

### Métricas Disponibles

```json
{
  "totalGenerations": 1250,
  "structures": { "A": 450, "B": 320, "C": 480 },
  "templateModes": { "structural": 620, "family": 630 },
  "timings": [1200, 1350, 980, 1450, ...],
  "p95Timing": 1420
}
```

### Logs de Auditoría

- **Base de datos**: Tabla `AuditLog` con hash SHA-256 del contenido
- **PII Masking**: Automático en logs (`17******12`)
- **Niveles**: `error`, `warn`, `info`, `debug`

## 🧪 QA y Testing

### Scripts Disponibles

```bash
# QA completa con dataset piloto
npm run qa:concuerdos

# Control de calidad para despliegue
npm run qa:gate

# Tests unitarios
npm test
```

### Umbrales de Calidad

| Métrica | Umbral Mínimo | Descripción |
|---------|----------------|-------------|
| Tasa de éxito | 85% | Casos que pasan QA |
| Precisión concordancias | 90% | "otorga" vs "otorgan" |
| Distribución estructuras | 60% | Estructuras válidas |
| Tiempo promedio | < 5s | Generación por documento |

## 🚨 Troubleshooting

### Problemas Comunes

#### 1. Error: "Cannot find package 'handlebars'"
```bash
npm install handlebars
```

#### 2. Error: "Circuit breaker OPEN"
- Verificar conectividad con Gemini API
- Revisar `GOOGLE_API_KEY`
- Esperar timeout automático o reiniciar servidor

#### 3. Error: "Template cache miss"
- Templates se cargan automáticamente
- Cache TTL: 5 minutos
- Forzar recarga: reiniciar servidor

#### 4. QA Gate falla
```bash
# Ver reporte detallado
cat qa-gate-report.json

# Ejecutar QA individual
npm run qa:concuerdos
```

### Logs de Debug

```bash
# Habilitar debug de extracción
DEBUG_EXTRACTION_METHOD=true

# Ver métricas detalladas
curl http://localhost:3001/api/concuerdos/metrics
```

## 📈 Métricas de Rendimiento

### Benchmarks Esperados

- **Extracción Gemini**: < 3s promedio
- **Generación template**: < 500ms
- **Tiempo total**: < 5s por documento
- **P95**: < 8s (percentil 95)

### Optimizaciones

- **Cache de templates**: Reduce I/O en disco
- **Circuit breaker**: Previene cascadas de fallos
- **Retry con backoff**: Maneja fallos temporales
- **Lazy loading**: Templates se cargan bajo demanda

## 🔐 Seguridad

### Autenticación y Autorización

- **JWT**: Tokens con expiración
- **Roles**: Solo MATRIZADOR puede generar concuerdos
- **Rate limiting**: Protección contra abuso
- **PII masking**: Datos sensibles enmascarados en logs

### Variables Sensibles

```bash
# Nunca loguear estas variables
GOOGLE_API_KEY
JWT_SECRET
DATABASE_URL
```

## 🚀 Despliegue

### Checklist Pre-Despliegue

- [ ] `npm run qa:gate` pasa con score ≥ 70
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Templates validados
- [ ] Circuit breaker en estado CLOSED

### Comandos de Despliegue

```bash
# Staging
npm run start:railway

# Producción
NODE_ENV=production npm run start:prod
```

### Rollback Plan

1. **Revertir código**: Git checkout a versión anterior
2. **Restaurar DB**: Backup automático antes de migraciones
3. **Limpiar cache**: Reiniciar servicios
4. **Monitoreo**: Verificar métricas post-rollback

## 📞 Soporte

### Canales de Comunicación

- **Issues**: GitHub repository
- **Logs**: Ver en consola del servidor
- **Métricas**: Endpoint `/metrics/concuerdos`

### Información de Debug

```bash
# Información del sistema
node -e "console.log(process.version, process.platform)"

# Estado de configuración
npm run debug-config

# Health check
curl http://localhost:3001/api/concuerdos/ocr-health
```

---

## 📝 Notas de Desarrollo

- **KISS Balanceado**: Simplicidad en arquitectura, excelencia en ejecución
- **No PII en logs**: Máscara automática aplicada
- **Circuit breaker**: Protección automática contra fallos
- **Cache inteligente**: Templates y métricas en memoria
- **QA gate**: Control de calidad obligatorio para despliegue

Última actualización: Diciembre 2024