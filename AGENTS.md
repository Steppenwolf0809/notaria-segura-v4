# CLAUDE.md - Sistema de Trazabilidad Documental Notarial

## CONTEXTO DEL PROYECTO

### Objetivo Principal
Sistema web para notaría que rastrea documentos desde creación hasta entrega al cliente, utilizando códigos de barras existentes y códigos de verificación WhatsApp.

### Problemática Resuelta
- Falta de registro sistemático de entregas
- No constancia de quién retiró documentos  
- Sin método estandarizado de verificación
- Ausencia de notificaciones al compareciente

### Stack Tecnológico
- **Backend**: Node.js + Express + PostgreSQL + Prisma ORM
- **Frontend**: React + Material UI + Vite
- **Autenticación**: JWT + bcrypt
- **Notificaciones**: WhatsApp (Twilio)
- **Deploy**: Railway (staging y producción)

## ARQUITECTURA DEL SISTEMA

### Roles del Sistema
- **ADMIN**: Supervisión completa, gestión usuarios, configuración
- **CAJA**: Gestión financiera, importación XMLs, reportes
- **MATRIZADOR**: Procesamiento documentos, cambio estados, notificaciones
- **RECEPCIÓN**: Entrega documentos, códigos verificación, consultas
- **ARCHIVO**: Supervisión documentos, información general

### Flujo Principal
1. **Importación**: XML del sistema notarial → Registro en sistema
2. **Asignación**: Documento asignado a matrizador
3. **Procesamiento**: Matrizador cambia estado a LISTO
4. **Notificación**: WhatsApp automático con código 4 dígitos
5. **Entrega**: Recepción valida código y entrega documento
6. **Confirmación**: Notificación WhatsApp de entrega completada

## PRINCIPIOS DE DESARROLLO

### Filosofía KISS Balanceada
```
MANTENER SIMPLE:
- Arquitectura sin abstracciones innecesarias
- Un componente por funcionalidad cuando sea posible
- Evitar configuraciones complejas sin valor
- No crear múltiples servicios para tareas simples

PERMITIR CALIDAD:
- Código limpio y bien estructurado
- UI intuitiva y responsive
- Manejo de errores apropiado
- Performance optimizado
- Documentación clara en código

BALANCE: Simplicidad en arquitectura + Excelencia en ejecución
```

### Patrones Establecidos
- **Componentes reutilizables** entre roles con adaptación por permisos
- **Servicios centralizados** para funcionalidades comunes
- **Middleware de autorización** granular por rol
- **Estado centralizado** con context API
- **Validaciones tanto frontend como backend**

## FUNCIONALIDADES PRINCIPALES

### ✅ Implementadas
- Sistema de autenticación robusto (cambio contraseñas)
- Panel administrativo avanzado (CRUD usuarios, supervisión)
- Importación y procesamiento XMLs notariales
- Códigos de verificación 4 dígitos automáticos
- Notificaciones WhatsApp bidireccionales
- Sistema de agrupación de documentos
- Historial universal de eventos por documento
- Dashboards personalizados por rol

### 🔄 En Desarrollo
- Templates WhatsApp configurables por admin
- Agrupación funcional en vista lista
- Sistema de desagrupación flexible
- Métodos de entrega alternativos

## GUIDELINES 

### Estructura de Archivos
```
backend/
├── src/
│   ├── controllers/     # Lógica de negocio por módulo
│   ├── services/        # Servicios reutilizables
│   ├── routes/         # Definición de endpoints
│   ├── middleware/     # Autenticación y autorización
│   └── utils/          # Utilidades generales

frontend/
├── src/
│   ├── components/     # Componentes React reutilizables
│   ├── pages/         # Páginas principales por rol
│   ├── services/      # Llamadas API centralizadas
│   ├── hooks/         # Custom hooks
│   └── contexts/      # Context providers
```

### Convenciones de Código
- **Nombres descriptivos** en español para dominio del negocio
- **Componentes en PascalCase**, servicios en camelCase
- **Props tipadas** con PropTypes o TypeScript cuando sea posible
- **Manejo de errores** consistente con try-catch y feedback visual
- **Loading states** para todas las operaciones asíncronas

### Patrones de Permisos
```javascript
// Middleware backend
const requireRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Acceso denegado' });
  }
  next();
};

// Frontend - verificación de permisos
const canAccess = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};
```

### Base de Datos - Campos Importantes
```sql
-- Documentos principales
Document: id, tramiteNumber, clientName, documentType, status, 
         matrizadorId, verificationCode, createdAt, updatedAt

-- Eventos/historial  
DocumentEvent: id, documentId, eventType, userId, description, 
              metadata, createdAt

-- Grupos de documentos
DocumentGroup: id, groupName, createdBy, createdAt
GroupMember: documentGroupId, documentId

-- Templates WhatsApp
WhatsAppTemplate: id, templateType, title, message, variables, active
```

### APIs - Estructura de Respuesta
```javascript
// Éxito
{
  success: true,
  data: { ... },
  message: "Operación completada"
}

// Error
{
  success: false,
  error: "Mensaje de error",
  details: { ... }
}
```

## TESTING Y VALIDACIÓN

### Casos de Prueba Críticos
1. **Flujo completo**: XML → Procesamiento → Notificación → Entrega
2. **Permisos por rol**: Verificar accesos apropiados
3. **Agrupación**: Documentos se mueven juntos correctamente
4. **Notificaciones**: WhatsApp se envía con información correcta
5. **Historial**: Eventos se registran apropiadamente

### Validaciones Obligatorias
- **Códigos únicos**: Verificación 4 dígitos no duplicados
- **Estados válidos**: Transiciones de estado apropiadas
- **Permisos**: Solo usuarios autorizados pueden realizar acciones
- **Datos requeridos**: Campos obligatorios validados

## DEPLOYMENT

### Ambientes
- **Staging**: Deploy automático desde rama `staging`
- **Producción**: Deploy desde rama `main`
- **Base de datos**: PostgreSQL separada por ambiente

### Variables de Entorno Críticas
```
NODE_ENV=production|staging|development
DATABASE_URL=postgresql://...
JWT_SECRET=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
WHATSAPP_ENABLED=true|false
```

## PRÓXIMOS DESARROLLOS

### Roadmap Inmediato
1. Templates WhatsApp configurables
2. Agrupación en vista lista
3. Sistema desagrupación flexible
4. Validación timestamps timezone

### Funcionalidades Futuras
- PWA y optimizaciones mobile
- Reportes avanzados productividad
- Sistema alertas automáticas
- Backup automático base datos
- QR codes para entrega

## CONTACTO Y SOPORTE
- **Desarrollador**: Principiante - Requiere explicaciones didácticas
- **Enfoque**: Balance entre simplicidad y funcionalidad profesional

---
*Última actualización: Enero 2025*