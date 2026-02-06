# 📚 Documentación Técnica - Sistema de Trazabilidad Notarial

## Índice General

### 🏗️ Arquitectura y Sistemas
| Documento | Descripción |
|-----------|-------------|
| [TECHNICAL-GUIDE.md](./TECHNICAL-GUIDE.md) | Guía técnica completa del sistema |
| [SYNC-ARCHITECTURE.md](./SYNC-ARCHITECTURE.md) | Arquitectura de sincronización con Koinor |
| [db_diagrama.mmd](./db_diagrama.mmd) | Diagrama de base de datos |

### 💰 Facturación y Pagos
| Documento | Descripción |
|-----------|-------------|
| [MODULO_FACTURACION_PAGOS.md](./MODULO_FACTURACION_PAGOS.md) | Módulo de facturación y pagos |
| [INSTRUCCIONES_CXC_PENDING_RECEIVABLES.md](./INSTRUCCIONES_CXC_PENDING_RECEIVABLES.md) | Sincronización CXC (Cuentas por Cobrar) |
| [DIAGNOSTICO_FACTURA_NO_ACTUALIZA.md](./DIAGNOSTICO_FACTURA_NO_ACTUALIZA.md) | Diagnóstico de facturas no actualizadas |

### 🔧 Integraciones
| Documento | Descripción |
|-----------|-------------|
| [REPORTE_INTEGRACION_KOINOR.md](./REPORTE_INTEGRACION_KOINOR.md) | Integración con sistema Koinor |
| [SYNC_AGENT_PLAN.md](./SYNC_AGENT_PLAN.md) | Plan del agente de sincronización |
| [koinhor_acceso_lectura_mysql.md](./koinhor_acceso_lectura_mysql.md) | Acceso a base de datos Koinor |

### 👤 Guías de Usuario
| Documento | Descripción |
|-----------|-------------|
| [user-guides/README.md](./user-guides/README.md) | Índice de guías de usuario |
| [user-guides/GUIA-ADMIN.md](./user-guides/GUIA-ADMIN.md) | Guía para administradores |
| [user-guides/GUIA-CAJA.md](./user-guides/GUIA-CAJA.md) | Guía para personal de caja |
| [user-guides/GUIA-MATRIZADOR.md](./user-guides/GUIA-MATRIZADOR.md) | Guía para matrizadores |
| [user-guides/GUIA-RECEPCION.md](./user-guides/GUIA-RECEPCION.md) | Guía para recepción |
| [user-guides/GUIA-ARCHIVO.md](./user-guides/GUIA-ARCHIVO.md) | Guía para archivo |
| [user-guides/FAQ.md](./user-guides/FAQ.md) | Preguntas frecuentes para usuarios |

### 🛠️ Guías de Desarrollo
| Documento | Descripción |
|-----------|-------------|
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Guía de solución de problemas |
| [FIXES_AGRUPACION_NOTIFICACIONES.md](./FIXES_AGRUPACION_NOTIFICACIONES.md) | Fixes de agrupación y notificaciones |
| [FIXES_NOTIFICATION_CENTER.md](./FIXES_NOTIFICATION_CENTER.md) | Fixes del centro de notificaciones |

### 📋 Features Específicas
| Documento | Descripción |
|-----------|-------------|
| [features/FUNCIONALIDAD_EDICION_DOCUMENTOS.md](./features/FUNCIONALIDAD_EDICION_DOCUMENTOS.md) | Edición de documentos |
| [features/IMPLEMENTACION_ROL_ARCHIVO_COMPLETA.md](./features/IMPLEMENTACION_ROL_ARCHIVO_COMPLETA.md) | Rol de archivo |
| [MODULO_FORMULARIOS_UAFE.md](./MODULO_FORMULARIOS_UAFE.md) | Formularios UAFÉ |
| [MODULO_QR_ESCRITURAS.md](./MODULO_QR_ESCRITURAS.md) | Módulo QR para escrituras |

---

## 🚀 Quick Start

### Para desarrolladores nuevos
1. Leer [TECHNICAL-GUIDE.md](./TECHNICAL-GUIDE.md) para entender la arquitectura
2. Revisar [SYNC-ARCHITECTURE.md](./SYNC-ARCHITECTURE.md) para entender los flujos de datos
3. Consultar [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) cuando hay problemas

### Para soporte/diagnóstico
1. Problemas de pagos → [DIAGNOSTICO_FACTURA_NO_ACTUALIZA.md](./DIAGNOSTICO_FACTURA_NO_ACTUALIZA.md)
2. Problemas de sincronización → [INSTRUCCIONES_CXC_PENDING_RECEIVABLES.md](./INSTRUCCIONES_CXC_PENDING_RECEIVABLES.md)
3. Errores generales → [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📝 Convenciones de Documentación

- Usar Markdown para todos los documentos
- Mantener código en bloques con lenguaje especificado (```javascript)
- Incluir diagramas en formato Mermaid cuando sea posible
- Actualizar fecha de última modificación al final de cada documento
- Usar emojis para facilitar navegación visual

---

*Última actualización: Febrero 2025*
