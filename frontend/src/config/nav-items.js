// Fuente única de navegación por rol
// Cada item puede mapear a una vista interna (view) o a una ruta (path) si se integra Router a futuro

export const navItemsByRole = {
  CAJA: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documentos', label: 'Documentos', view: 'documentos', icon: 'Assignment' },
    { id: 'subir-xml', label: 'Subir XML', view: 'uploads', icon: 'CloudUpload' },
    {
      id: 'facturacion',
      label: 'Facturación',
      icon: 'AccountBalance',
      submenu: [
        { id: 'importar-datos', label: 'Importar Datos', view: 'importar-datos', icon: 'CloudUpload' },
        { id: 'facturas', label: 'Facturas', view: 'facturas', icon: 'Receipt' },
        { id: 'pagos', label: 'Pagos', view: 'pagos', icon: 'Payments' },
        { id: 'reportes', label: 'Reportes', view: 'reportes', icon: 'Assessment' }
      ]
    }
  ],
  RECEPCION: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documentos', label: 'Gestión de Documentos', view: 'documentos', icon: 'Assignment' },
    { id: 'notificaciones', label: 'Notificaciones', view: 'notificaciones', icon: 'WhatsApp' }
  ],
  MATRIZADOR: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documents', label: 'Documentos', view: 'documents', icon: 'Assignment' },
    { id: 'notifications', label: 'Notificaciones', view: 'notifications', icon: 'WhatsApp' },
    { id: 'cartera-cobros', label: 'Cartera de Cobros', view: 'cartera-cobros', icon: 'AccountBalance' },
    { id: 'formularios-uafe', label: 'Formularios UAFE', view: 'formularios-uafe', icon: 'Description' },
    { id: 'generador-qr', label: 'Generador QR', view: 'generador-qr', icon: 'QrCode' }
  ],
  ADMIN: [
    { id: 'dashboard', label: 'Panel de Control', view: 'dashboard', icon: 'Dashboard' },
    { id: 'users', label: 'Gestión de Usuarios', view: 'users', icon: 'Person' },
    { id: 'documents', label: 'Supervisión Documentos', view: 'documents', icon: 'Description' },
    { id: 'qr-management', label: 'Gestor QR', view: 'qr-management', icon: 'QrCode' },
    { id: 'formularios-uafe', label: 'Gestión Formularios UAFE', view: 'formularios-uafe', icon: 'Description' },
    { id: 'analisis-uafe', label: 'Análisis UAFE', view: 'analisis-uafe', icon: 'Analytics' },
    {
      id: 'facturacion',
      label: 'Facturación',
      icon: 'AccountBalance',
      submenu: [
        { id: 'importar-datos', label: 'Importar Datos', view: 'importar-datos', icon: 'CloudUpload' },
        { id: 'facturas', label: 'Facturas', view: 'facturas', icon: 'Receipt' },
        { id: 'pagos', label: 'Pagos', view: 'pagos', icon: 'Payments' },
        { id: 'reportes', label: 'Reportes', view: 'reportes', icon: 'Assessment' }
      ]
    },
    { id: 'notifications', label: 'Notificaciones', view: 'notifications', icon: 'WhatsApp' },
    { id: 'encuestas-satisfaccion', label: 'Encuestas Satisfacción', view: 'encuestas-satisfaccion', icon: 'Poll' },
    { id: 'settings', label: 'Configuración', view: 'settings', icon: 'Settings' },
    { id: 'whatsapp-templates', label: 'Templates WhatsApp', view: 'whatsapp-templates', icon: 'WhatsApp' }
  ],
  ARCHIVO: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documentos', label: 'Mis Documentos', view: 'documentos', icon: 'FolderSpecial' },
    { id: 'notificaciones', label: 'Notificaciones', view: 'notificaciones', icon: 'WhatsApp' },
    { id: 'supervision', label: 'Supervisión General', view: 'supervision', icon: 'Visibility' }
  ]
};

export default navItemsByRole;
