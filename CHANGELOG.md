# 📋 Changelog - Sistema de Trazabilidad Notarial

Todos los cambios notables de este proyecto serán documentados en este archivo.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

### Added
- **Documentación para usuarios** completa en `docs/user-guides/`
  - `README.md` - Índice y primeros pasos
  - `GUIA-ADMIN.md` - Guía completa para administradores
  - `GUIA-CAJA.md` - Guía para personal de caja
  - `GUIA-MATRIZADOR.md` - Guía para matrizadores
  - `GUIA-RECEPCION.md` - Guía para recepción
  - `GUIA-ARCHIVO.md` - Guía para archivo
  - `FAQ.md` - Preguntas frecuentes
- Documentación técnica completa en carpeta `docs/`
  - `README.md` - Índice de documentación
  - `TECHNICAL-GUIDE.md` - Guía técnica del sistema
  - `SYNC-ARCHITECTURE.md` - Arquitectura de sincronización
  - `TROUBLESHOOTING.md` - Guía de solución de problemas

---

## [2025-02-06]

### Added
- **Eventos de pago en historial de documentos** (Opción C)
  - Sync de CXC ahora crea automáticamente evento `PAYMENT_REGISTERED` cuando marca factura como pagada
  - Script `add-payment-events-to-history.js` para agregar eventos retroactivos
  - 1,680 eventos de pago creados para documentos históricos

### Fixed
- **Sincronización Invoice ↔ PendingReceivable**
  - Cuando CXC marca facturas como PAID, ahora también actualiza tabla `Invoice`
  - Previene inconsistencias entre tablas de facturación
  
- **Protección contra falsos positivos en CXC sync**
  - Registros con errores de procesamiento ya no se marcan incorrectamente como PAID
  - Array `failedInvoiceNumbers` para rastrear y excluir registros fallidos

- **Cálculo de estado de pago**
  - Todos los endpoints ahora usan `Math.max(paymentsTotal, syncedPaidAmount)`
  - Evita mostrar pagos duplicados cuando existen en ambas fuentes

---

## [2025-02-05]

### Fixed
- **Campos pagoEfectivo/pagoCheque vacíos en XML**
  - Agregado manejo de valores vacíos con fallback a "0"
  - Script `fix-invoice-payment-fields.js` para corregir datos existentes
  
- **Facturas mostrando "Sin factura"**
  - Endpoint `getMyDocuments` ahora incluye relación `payments`
  - Cálculo correcto de total pagado en vista de matrizador

### Changed
- Mejoras en logging de sync para debugging

---

## [2025-02-04]

### Fixed
- **Desfase entre Invoice y PendingReceivable**
  - Creados scripts de diagnóstico:
    - `detect-invoice-desfase.js` - Detecta diferencias
    - `fix-all-invoice-desfase.js` - Corrige desfases
    - `sync-invoice-from-pending.js` - Sincroniza desde CXC
    - `diagnose-factura.js` - Diagnóstico individual
  
- **Estado de pago inconsistente**
  - Endpoint `getDocumentPaymentStatus` actualizado
  - Endpoint `getDocumentById` con cálculo correcto
  - Componente `EstadoPago` muestra información precisa

---

## [2025-02-03]

### Added
- Sistema de agrupación de documentos (fase 1)
- Mejoras en centro de notificaciones WhatsApp

### Fixed
- Validación de timestamps en sync incremental
- Manejo de errores en importación XML

---

## [2025-01-30]

### Added
- Script `analyze-documents-without-invoice.js` para análisis de cobertura

### Fixed
- UI: "Sin factura" mostrado incorrectamente en documentos con factura vinculada

---

## [2025-01-28]

### Added
- Integración completa con Koinor CXC (Cuentas por Cobrar)
- Tabla `PendingReceivable` para tracking de saldos
- Sync automático de estados de pago

### Changed
- Mejoras en rendimiento de queries de documentos

---

## [2025-01-20]

### Added
- Módulo de facturación y pagos v1.0
- Tabla `Invoice` para almacenar facturas electrónicas
- Relación Documento-Factura automática por `tramiteNumber`

### Fixed
- Codificación UTF-8 en base de datos
- Manejo de caracteres especiales en nombres de clientes

---

## [2025-01-15]

### Added
- Sistema de historial de eventos (`DocumentEvent`)
- Tracking de quién retira documentos
- Códigos de verificación de 4 dígitos para entregas

---

## [2024-12-20]

### Added
- Sistema de notificaciones WhatsApp (Twilio)
- Templates configurables
- Notificación automática al cambiar estado a LISTO

---

## [2024-12-10]

### Added
- Rol ARCHIVO con permisos de supervisión
- Dashboard personalizado por rol

---

## [2024-11-15]

### Added
- Sistema de autenticación JWT
- Gestión de usuarios con roles
- Cambio de contraseñas obligatorio primer login

---

## [2024-10-01]

### Added
- Versión inicial del sistema
- Importación de XML notariales
- Asignación de matrizadores
- Cambio de estados de documentos

---

## Tipos de Cambios

- **Added**: Nuevas funcionalidades
- **Changed**: Cambios en funcionalidades existentes
- **Deprecated**: Funcionalidades obsoletas
- **Removed**: Funcionalidades eliminadas
- **Fixed**: Corrección de bugs
- **Security**: Mejoras de seguridad

---

*Última actualización: Febrero 2025*
