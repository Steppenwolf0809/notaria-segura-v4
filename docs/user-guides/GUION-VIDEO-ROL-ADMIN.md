# Guion de Video Instructivo - Rol Administrador

## 1. Objetivo del video
Mostrar, de forma practica y ordenada, como un usuario con rol `ADMIN` usa el sistema para supervisar operacion, gestionar usuarios, controlar documentos, revisar mensajeria interna y administrar modulos clave (UAFE, QR, facturacion, notificaciones y templates).

## 2. Publico objetivo
- Administrador nuevo del sistema.
- Administrador actual que necesita estandarizar el uso diario.
- Personal de soporte interno que capacita administradores.

## 3. Duracion sugerida
15 a 20 minutos.

## 4. Preparacion antes de grabar
- Ingresar con una cuenta real de rol `ADMIN`.
- Tener datos de prueba:
  - Usuarios en varios roles (`MATRIZADOR`, `ARCHIVO`, `RECEPCION`, `CAJA`).
  - Documentos en estados `PENDIENTE`, `EN_PROCESO`, `LISTO`, `ENTREGADO`.
  - Al menos 1 documento asignado y 1 sin asignar.
  - Registros en modulo QR.
  - Protocolos/personas UAFE.
  - Facturas y pagos.
- Verificar que el menu admin muestre estas secciones:
  - `Dashboard`
  - `Usuarios`
  - `Documentos`
  - `Seguimiento Mensajes`
  - `Formularios UAFE`
  - `Analisis UAFE`
  - `Notificaciones`
  - `Encuestas`
  - `QR`
  - `Participacion Estado`
  - `Facturacion` (`Importar Datos`, `Facturas`, `Pagos`, `Reportes`)
  - `Configuracion`
  - `Templates WhatsApp`

## 5. Guion tecnico por escenas

### Escena 1 - Introduccion y alcance (0:00 - 0:45)
**En pantalla**
- Login.
- Entrada al panel administrador.

**Locucion sugerida**
"En este video vamos a recorrer el rol Administrador del sistema de trazabilidad notarial. Veremos las funciones principales para control operativo, gestion de usuarios, supervision documental, configuracion y seguimiento."

---

### Escena 2 - Navegacion general del panel (0:45 - 1:40)
**En pantalla**
- Sidebar completo.
- Cambio rapido entre modulos.

**Locucion sugerida**
"El administrador tiene un menu dividido por bloques: Principal, Gestion, Financiero y Sistema. Desde aqui se controla toda la operacion. Al final del menu tambien puede cambiar tema visual, cambiar contrasena y cerrar sesion."

---

### Escena 3 - Dashboard de supervision (1:40 - 3:20)
**En pantalla**
- Filtros: estado, umbral de retraso, matrizador.
- KPIs y tabla de documentos criticos.
- Tabla de rendimiento de equipo.

**Locucion sugerida**
"El Dashboard concentra la supervision diaria. Podemos filtrar por estado, por responsable y por umbral de retraso. Aqui vemos carga activa, documentos criticos, facturacion y velocidad promedio del equipo. Desde la lista podemos abrir detalle de documento y enviar mensajes internos al responsable."

**Mensaje clave**
- Este panel es para priorizacion diaria y deteccion de cuellos de botella.

---

### Escena 4 - Gestion de Usuarios (3:20 - 5:20)
**En pantalla**
- Lista de usuarios con filtros.
- Boton `Crear Usuario`.
- Modal de creacion/edicion.
- Activar/desactivar usuario.
- Eliminacion con confirmacion.

**Locucion sugerida**
"En Gestion de Usuarios, el admin puede crear, editar, activar, desactivar o eliminar cuentas. El formulario valida email, rol y seguridad de contrasena. Importante: el sistema no permite que el admin se desactive o se elimine a si mismo, como medida de seguridad."

**Puntos a mencionar**
- Roles validos: `ADMIN`, `CAJA`, `MATRIZADOR`, `RECEPCION`, `ARCHIVO`.
- Contrasena recomendada: minimo 8 caracteres, mayuscula, minuscula y numero.

---

### Escena 5 - Supervision de Documentos (5:20 - 8:30)
**En pantalla**
- Filtros avanzados (busqueda, estado, tipo, matrizador, fechas, orden).
- Seleccion multiple.
- Botones de acciones masivas.
- Timeline de un documento.
- Eliminacion individual y masiva.

**Locucion sugerida**
"Este es el modulo mas operativo para admin. Podemos aplicar filtros avanzados, revisar estado de pago, detectar vencidos, abrir timeline y ejecutar acciones en lote. Las operaciones masivas incluyen reasignar matrizador o cambiar estado. Tambien se puede exportar informacion y, si es necesario, eliminar documentos."

**Advertencia en locucion**
"Las eliminaciones son irreversibles y deben usarse solo con validacion previa."

---

### Escena 6 - Mensajes internos y seguimiento (8:30 - 10:00)
**En pantalla**
- `Seguimiento Mensajes`.
- Tab `Todos los Mensajes` y `Mis Enviados`.
- Filtros por estado/remitente.
- KPIs de resolucion.

**Locucion sugerida**
"El admin puede enviar mensajes internos desde supervision documental y dar seguimiento aqui. La vista global muestra pendientes, resueltos y tasa de resolucion, con trazabilidad por remitente y destinatario."

---

### Escena 7 - Formularios UAFE y Analisis UAFE (10:00 - 12:00)
**En pantalla**
- `Formularios UAFE`: lista de protocolos, crear protocolo, agregar persona, editar/eliminar.
- `Analisis UAFE`: KPIs, alertas, exportacion CSV, edicion/eliminacion de persona.

**Locucion sugerida**
"En Formularios UAFE, el administrador gestiona protocolos y personas asociadas, con acciones de alta, edicion, descarga y control de informacion. En Analisis UAFE, se centraliza la vista de riesgo con alertas, montos y actividad por persona, incluyendo exportacion para revision externa."

---

### Escena 8 - Centro de Notificaciones (12:00 - 13:20)
**En pantalla**
- Modulo `Notificaciones`.
- Tabs `Por Notificar`, `Para Recordar`, `Enviados`.
- Busqueda de clientes y apertura de modal de envio.

**Locucion sugerida**
"El centro de notificaciones permite gestionar envios de WhatsApp por cliente agrupando documentos. Desde aqui el admin puede enviar notificaciones nuevas, recordatorios y revisar enviados."

---

### Escena 9 - Gestion QR y Encuestas (13:20 - 14:40)
**En pantalla**
- `QR`: KPIs de uso y tabla de escrituras.
- Detalle de un QR.
- `Encuestas`: estadisticas y filtros por calificacion/fecha.

**Locucion sugerida**
"El Gestor QR permite supervisar tokens, estado de escrituras y uso de verificaciones. En Encuestas, el admin revisa satisfaccion del cliente y tendencias para mejora continua."

---

### Escena 10 - Financiero y Participacion Estado (14:40 - 16:40)
**En pantalla**
- `Participacion Estado`.
- Submenu `Facturacion`: `Importar Datos`, `Facturas`, `Pagos`, `Reportes`.

**Locucion sugerida**
"En el bloque financiero, el admin puede revisar participacion al Estado y operar el ciclo de facturacion: importacion de archivos, consulta de facturas, pagos y reportes."

---

### Escena 11 - Configuracion y Templates WhatsApp (16:40 - 18:20)
**En pantalla**
- `Configuracion`.
- `Templates WhatsApp`: crear, editar, activar/desactivar, vista previa, restaurar por defecto.

**Locucion sugerida**
"En Configuracion se visualiza informacion general del sistema y del administrador actual. En Templates WhatsApp se administra el contenido oficial de mensajes, con variables dinamicas y vista previa para validar antes de usar en produccion."

**Mensaje clave**
- Mantener templates consistentes evita errores de comunicacion con clientes.

---

### Escena 12 - Cierre y buenas practicas (18:20 - 19:30)
**En pantalla**
- Regreso a dashboard.
- Checklist final en slide simple.

**Locucion sugerida**
"Como buenas practicas: revisar dashboard al inicio del dia, evitar eliminaciones sin respaldo, mantener usuarios activos y roles correctos, monitorear mensajes pendientes y validar templates antes de cambios masivos. Con esto, el admin mantiene trazabilidad, control y continuidad operativa."

## 6. Checklist final para el presentador
- Mostrar al menos una accion por cada modulo principal.
- Repetir advertencia de acciones irreversibles (eliminaciones).
- Explicar con lenguaje simple la diferencia entre supervisar, operar y configurar.
- Cerrar con recomendaciones diarias de uso.

## 7. Notas de edicion (opcional)
- Insertar zoom cuando se muestren botones criticos (`Eliminar`, `Operaciones en lote`).
- Mostrar texto corto en pantalla para cada seccion.
- Cortar tiempos de carga para mantener ritmo.

---
Documento creado a partir de la revision del codigo actual del rol `ADMIN` en frontend y backend.
