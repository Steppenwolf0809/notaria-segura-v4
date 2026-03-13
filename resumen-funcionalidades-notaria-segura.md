# Descripción de Funcionalidades del Sistema "Notaria Segura"

Este documento describe las capacidades y módulos principales del sistema de gestión notarial, diseñado para ofrecer trazabilidad, seguridad y eficiencia.

### **1. Gestión del Flujo de Documentos Notariales**
Es el núcleo del sistema, digitalizando el ciclo de vida completo de un trámite notarial.

- **Inicio del Flujo por Facturación:** Un trámite nace en el sistema cuando un usuario de **Caja** importa una factura en formato XML desde el sistema contable Koinor. El sistema extrae los datos de la factura y crea un nuevo documento, vinculando la información financiera desde el inicio.
- **Asignación y Tareas por Roles:** Una vez creado, el documento es asignado por **Caja** a un **Matrizador**, quien se encarga de la preparación y redacción del contenido del acto o contrato notarial.
- **Seguimiento de Estado:** El sistema rastrea cada documento a través de estados claros (`En Proceso`, `Listo para Entrega`, `Entregado`, `Anulado`), ofreciendo visibilidad completa del proceso.

### **2. Módulo Financiero y de Cobranzas**
Este módulo centraliza toda la actividad financiera, siendo la principal herramienta de los roles de **Caja** y **Admin**.

- **Doble Fuente de Datos:** El sistema integra información de dos fuentes distintas para una visión completa:
    - **Historial de Pagos (XML):** Se importan archivos XML que contienen el registro de cada pago o abono realizado, alimentando la tabla transaccional de pagos.
    - **Cartera por Cobrar (XLS):** Periódicamente, se importa un reporte en Excel (XLS) con una "fotografía" de todos los saldos pendientes. Esta información se almacena de forma separada para no interferir con los registros de pagos reales.
- **Gestión del Estado de Pago:** Basado en los pagos importados, el sistema calcula y asigna automáticamente un estado a cada factura:
    - `PARTIAL`: Ha recibido al menos un abono pero aún tiene saldo.
    - `PAID`: El saldo es cero.
    - `OVERDUE`: La fecha de vencimiento ha pasado y aún tiene saldo.
- **Visibilidad del Estado de Pago:** El estado de la factura es visible en todo el sistema para informar las decisiones:
    - **Recepción:** Ve una alerta visual si un cliente intenta retirar un documento con saldo pendiente (aunque el sistema, por diseño, no bloquea la entrega, solo informa).
    - **Matrizador:** Puede ver el estado de pago de los documentos que tiene asignados.
- **Gestión de Cartera y Cobranza:**
    - **Vista de Cartera:** Los roles de **Caja** y **Admin** tienen acceso a un módulo completo de "Cuentas por Cobrar" para ver todos los saldos pendientes, agrupados por cliente.
    - **Recordatorios de Cobro por WhatsApp:** Desde la vista de cartera, un usuario autorizado puede **generar y enviar manualmente un recordatorio de pago** por WhatsApp. El sistema crea un mensaje detallado con el desglose de todas las facturas pendientes y el saldo total del cliente.

### **3. Módulo de Control Fiscal (Participación al Estado)**
Esta es una herramienta de supervisión financiera para **Caja** y **Admin**, diseñada para gestionar los pagos de impuestos progresivos basados en la facturación.

- **Monitoreo en Tiempo Real:** El módulo muestra la facturación total del mes y la base imponible acumulada (sin IVA).
- **Cálculo de Impuesto Progresivo:** El sistema calcula automáticamente el monto a pagar por "Participación al Estado" según el nivel o "esquema" de facturación alcanzado. Esta lógica se implementa en el frontend, utilizando datos de facturación del backend.
- **Proyección y Alertas:** Incluye una barra de progreso que indica visualmente qué tan cerca está la notaría de alcanzar el siguiente nivel de impuestos, mostrando el monto restante para llegar a él.
- **Fechas Límite:** El panel informa sobre la fecha límite para realizar el pago del impuesto calculado.

### **4. Verificación Pública y Seguridad (Módulo QR)**
- **Generación de QR:** Los **Matrizadores** pueden generar un código QR único para cada escritura.
- **Página de Verificación Pública:** Al escanear el QR, cualquier persona es dirigida a una página web pública que muestra los datos esenciales del documento (acto, fecha, notario), permitiendo verificar su autenticidad de forma instantánea.

### **5. Comunicación y Notificaciones al Cliente**
- **Notificaciones de Estado por WhatsApp:** El sistema envía mensajes automáticos cuando un documento está `Listo para Retiro` o ha sido `Entregado`.
- **Código de Retiro Único:** La notificación de "Documento Listo" incluye un código único para una entrega segura en **Recepción**.
- **Encuesta de Satisfacción:** Junto con la notificación de "Documento Listo", se envía un enlace a una encuesta para medir la satisfacción del cliente con el servicio.

### **6. Capacidades del Rol de Administrador (Admin)**
El rol de **Admin** tiene control total sobre la configuración y supervisión del sistema.

- **Gestión Total de Usuarios:**
    - **CRUD Completo:** Crear, ver, editar y desactivar/eliminar perfiles de todos los roles.
    - **Control de Acceso:** Asignar roles y gestionar permisos.
- **Supervisión y Auditoría de Documentos:**
    - **Vista Global (Oversight):** Acceso a un panel de supervisión con filtros avanzados para ver todos los documentos del sistema.
    - **Operaciones en Lote:** Realizar acciones masivas como reasignar múltiples documentos o cambiar su estado.
    - **Historial Completo:** Acceso al historial de eventos de cualquier documento para auditorías.
- **Control Total del Sistema:**
    - **Gestión de Notificaciones:** Administrar las plantillas de mensajes de WhatsApp, ver el historial de envíos y reintentar notificaciones fallidas.
    - **Exportación de Datos:** Exportar listados y reportes a formatos como Excel o CSV.
    - **Acciones Críticas:** Permisos para realizar acciones irreversibles como la eliminación permanente de documentos.
    - **Base de Datos UAFE:** Consultar la base de datos de personas registradas para fines de cumplimiento normativo.