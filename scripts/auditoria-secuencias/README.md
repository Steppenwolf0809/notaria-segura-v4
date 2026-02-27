# 🔍 Script de Auditoría de Secuencias Documentales

## 📖 Descripción

Este script analiza las secuencias de documentos registrados en la base de datos PostgreSQL de Railway (staging) y genera un reporte Excel detallado identificando números de documento faltantes ("huecos") en cada libro.

## 🎯 Características

- ✅ Conexión directa a PostgreSQL usando `pg` (node-postgres)
- ✅ Análisis de 5 tipos de libros: Arrendamientos (A), Certificaciones (C), Diligencias (D), Protocolo (P), Otros (O)
- ✅ Soporte para documentos de 2025 y 2026
- ✅ Detección automática de números faltantes en secuencias
- ✅ Estimación de fechas usando interpolación lineal
- ✅ Generación de reporte Excel con 3 hojas
- ✅ Progreso en consola con estadísticas en tiempo real

## 📋 Requisitos Previos

- Node.js 16 o superior
- Acceso a la base de datos PostgreSQL en Railway
- Credenciales de conexión (DATABASE_URL)

## 🚀 Instalación

1. **Navegar al directorio del script:**
   ```bash
   cd scripts/auditoria-secuencias
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   
   Copia el archivo `.env.example` a `.env`:
   ```bash
   copy .env.example .env
   ```
   
   > ✅ **Ya configurado**: El archivo `.env.example` incluye la URL de staging por defecto
   
   La URL ya está lista para usar la base de datos de **STAGING**:
   ```env
   DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
   ```
   
   > ⚠️ **Seguridad**: Este script usa STAGING (copia de producción), nunca producción directa

## ▶️ Ejecución

Ejecuta el script con:

```bash
npm start
```

O directamente:

```bash
node index.js
```

## 📊 Salida del Script

### Consola

El script mostrará progreso en tiempo real:

```
🔍 AUDITORÍA DE SECUENCIAS DOCUMENTALES
=========================================

Conectando a base de datos...  
✅ Conexión exitosa

Consultando documentos...      
✅ 1,247 documentos encontrados

Analizando secuencias por libro:

📚 Arrendamientos (A)...
   - 2025: 14/16 documentos, 2 faltantes
   - 2026: 3/3 documentos, 0 faltantes

📚 Certificaciones (C)...
   - 2025: 290/298 documentos, 8 faltantes
   - 2026: 72/74 documentos, 2 faltantes

[...]

Generando reporte Excel...     
✅ Reporte guardado

==================================================
RESUMEN GENERAL
==================================================
📊 Total documentos esperados: 1,285
✅ Total encontrados: 1,247
❌ Total faltantes: 38
📈 Completitud general: 97.04%
==================================================

📄 Archivo generado: reporte_auditoria_secuencias_20260114_153022.xlsx
📂 Ubicación: C:\notaria-segura\scripts\auditoria-secuencias\reporte_auditoria_secuencias_20260114_153022.xlsx
```

### Reporte Excel

El archivo Excel generado contiene **3 hojas**:

#### 📝 Hoja 1: Resumen
| Libro | Año | Rango Analizado | Total Esperados | Encontrados | Faltantes | % Completitud |
|-------|-----|-----------------|-----------------|-------------|-----------|---------------|
| Arrendamientos | 2025 | 00100 - 00115 | 16 | 14 | 2 | 87.50% |
| Certificaciones | 2025 | 02505 - 02802 | 298 | 290 | 8 | 97.32% |
| ... | ... | ... | ... | ... | ... | ... |

#### ⚠️ Hoja 2: Detalle Faltantes
| # | Libro | Año | Código Completo | Número Secuencial | Fecha Estimada | Doc Anterior | Doc Siguiente |
|---|-------|-----|-----------------|-------------------|----------------|--------------|---------------|
| 1 | Protocolo | 2025 | 20251701018P02632 | 2632 | 2025-11-12 ~11:36 | #02630 (2025-11-12) | #02635 (2025-11-12) |
| ... | ... | ... | ... | ... | ... | ... | ... |

#### ✅ Hoja 3: Documentos Encontrados
| Código Barras | Libro | Año | Número | Fecha Registro |
|---------------|-------|-----|--------|----------------|
| 20251701018P02629 | Protocolo | 2025 | 2629 | 2025-11-12 10:00:00 |
| ... | ... | ... | ... | ... |

## 🔧 Estructura del Código

```
scripts/auditoria-secuencias/
├── index.js          # Script principal
├── config.js         # Configuración de rangos y utilidades
├── package.json      # Dependencias
├── .env              # Variables de entorno (no incluido en git)
├── .env.example      # Template de configuración
└── README.md         # Este archivo
```

## 🧮 Algoritmo de Estimación de Fechas

Para cada documento faltante, el script:

1. **Busca el documento anterior más cercano** (número menor más próximo)
2. **Busca el documento siguiente más cercano** (número mayor más próximo)
3. **Interpola linealmente** la fecha basándose en:
   - Diferencia de tiempo entre docs anterior y siguiente
   - Posición relativa del número faltante

**Ejemplo:**
```
Doc #02630 → 2025-11-12 10:00
Doc #02635 → 2025-11-12 14:00
Faltante #02632 → Estimado: 2025-11-12 ~11:36
```

Si solo hay documento anterior o siguiente, usa esa fecha con nota "(estimación aproximada)".

## 🛡️ Manejo de Errores

El script incluye manejo de errores para:

- ❌ **Conexión fallida**: Verifica credenciales y URL
- ❌ **Tabla no encontrada**: Muestra mensaje para verificar schema
- ❌ **Sin documentos**: Verifica filtros de fecha
- ❌ **Error de escritura Excel**: Verifica permisos de carpeta

## 📝 Configuración de Rangos

Los rangos están definidos en `config.js`:

```javascript
RANGOS: {
  P: {
    nombre: 'Protocolo',
    2025: { inicio: 2629, fin: 3062 },
    2026: { inicio: 1, fin: 74 }
  },
  // ... más libros
}
```

Para modificar rangos, edita `config.js` y ejecuta nuevamente el script.

## 🔍 Troubleshooting

### Error: "DATABASE_URL no está definida"
**Solución**: Asegúrate de crear el archivo `.env` a partir de `.env.example` y configurar la URL correcta.

### Error: "relation 'documents' does not exist"
**Solución**: Verifica que:
1. Estás usando la base de datos correcta (staging)
2. El nombre de la tabla en el código coincide con tu schema Prisma

### No se encuentran documentos
**Solución**: Verifica que:
1. Las fechas en `config.js` sean correctas
2. Los documentos tengan `protocolNumber` no nulo
3. Estés conectado a la base de datos correcta

### Errores de permisos al guardar Excel
**Solución**: Cierra cualquier archivo Excel abierto con el mismo nombre y verifica permisos de escritura en la carpeta.

## 📚 Conceptos Educativos

Este script demuestra:

1. **Uso de `pg` vs Prisma**: Scripts standalone se benefician de `pg` directo por simplicidad
2. **Interpolación lineal**: Técnica matemática para estimar valores entre puntos conocidos
3. **Análisis de secuencias**: Patrón común en auditorías de datos numéricos
4. **Generación de Excel con ExcelJS**: Creación programática de reportes complejos
5. **Conexiones remotas a PostgreSQL**: Manejo de conexiones TCP a bases de datos cloud

## 🔐 Seguridad

- ✅ Script de **solo lectura** - no modifica datos
- ✅ Usa base de datos de **STAGING**, no producción
- ✅ Credenciales en `.env` (no incluido en control de versiones)

## 📄 Licencia

PRIVATE - Uso interno de Notaría Segura

---

**Desarrollado para**: Notaría Segura  
**Versión**: 1.0.0  
**Última actualización**: Enero 2026
