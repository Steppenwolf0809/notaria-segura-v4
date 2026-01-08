// Fuente única de navegación por rol
// Cada item puede mapear a una vista interna (view) o a una ruta (path) si se integra Router a futuro

export const navItemsByRole = {
  CAJA: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documentos', label: 'Documentos', view: 'documentos', icon: 'Assignment' },
    { id: 'subir-xml', label: 'Subir XML', view: 'uploads', icon: 'CloudUpload' }
  ],
  RECEPCION: [
    // Dashboard removido - Las estadísticas están integradas en la vista principal
    // Historial WhatsApp removido - Funcionalidad no implementada
    { id: 'documentos', label: 'Gestión de Documentos', view: 'documentos', icon: 'Assignment' }
  ],
  MATRIZADOR: [
    { id: 'dashboard', label: 'Dashboard', view: 'dashboard', icon: 'Dashboard' },
    { id: 'documents', label: 'Documentos', view: 'documents', icon: 'Assignment' },
    { id: 'history', label: 'Historial', view: 'history', icon: 'History' },
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
    { id: 'notifications', label: 'Notificaciones', view: 'notifications', icon: 'Notifications' },
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