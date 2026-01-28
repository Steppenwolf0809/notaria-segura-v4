import apiClient from './api-client';

/**
 * SERVICIO DE FACTURACIÓN
 * Maneja las peticiones al backend para el módulo de facturación y pagos
 * Endpoints: /api/billing/*
 */

/**
 * ============================================================================
 * SECCIÓN 1: HEALTH CHECK Y DASHBOARD
 * ============================================================================
 */

/**
 * Health check del módulo de facturación
 * @returns {Promise<Object>} Estado del servicio
 */
async function healthCheck() {
    const response = await apiClient.get('/billing/health');
    return response.data;
}

/**
 * Obtener estadísticas generales de facturación
 * @returns {Promise<Object>} Estadísticas
 */
async function getStats() {
    const response = await apiClient.get('/billing/stats');
    return response.data;
}

/**
 * Obtener resumen para dashboard
 * @returns {Promise<Object>} Resumen de facturación
 */
async function getSummary() {
    const response = await apiClient.get('/billing/summary');
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 2: FACTURAS
 * ============================================================================
 */

/**
 * Obtener lista de facturas con filtros y paginación
 * @param {Object} params - Parámetros de búsqueda
 * @param {number} params.page - Página (1-indexed)
 * @param {number} params.limit - Límite de resultados
 * @param {string} params.status - Filtro por estado (PAID, PARTIAL, PENDING, OVERDUE)
 * @param {string} params.search - Búsqueda por número o cliente
 * @param {string} params.dateFrom - Fecha desde (YYYY-MM-DD)
 * @param {string} params.dateTo - Fecha hasta (YYYY-MM-DD)
 * @returns {Promise<Object>} Lista paginada de facturas
 */
async function getInvoices(params = {}) {
    const response = await apiClient.get('/billing/invoices', { params });
    return response.data;
}

/**
 * Obtener detalle de una factura
 * @param {number|string} invoiceId - ID de la factura
 * @returns {Promise<Object>} Detalle de factura
 */
async function getInvoiceById(invoiceId) {
    const response = await apiClient.get(`/billing/invoices/${invoiceId}`);
    return response.data;
}

/**
 * Obtener pagos asociados a una factura
 * @param {number|string} invoiceId - ID de la factura
 * @returns {Promise<Object>} Lista de pagos
 */
async function getInvoicePayments(invoiceId) {
    const response = await apiClient.get(`/billing/invoices/${invoiceId}/payments`);
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 3: PAGOS
 * ============================================================================
 */

/**
 * Obtener lista de pagos con filtros
 * @param {Object} params - Parámetros de búsqueda
 * @param {number} params.page - Página
 * @param {number} params.limit - Límite
 * @param {string} params.dateFrom - Fecha desde
 * @param {string} params.dateTo - Fecha hasta
 * @returns {Promise<Object>} Lista paginada de pagos
 */
async function getPayments(params = {}) {
    const response = await apiClient.get('/billing/payments', { params });
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 4: CLIENTES
 * ============================================================================
 */

/**
 * Obtener lista de clientes con saldos
 * @param {Object} params - Parámetros de búsqueda
 * @returns {Promise<Object>} Lista de clientes
 */
async function getClients(params = {}) {
    const response = await apiClient.get('/billing/clients', { params });
    return response.data;
}

/**
 * Obtener saldo de un cliente específico
 * @param {string} taxId - Cédula o RUC del cliente
 * @returns {Promise<Object>} Balance del cliente
 */
async function getClientBalance(taxId) {
    const response = await apiClient.get(`/billing/clients/${encodeURIComponent(taxId)}/balance`);
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 5: IMPORTACIÓN
 * ============================================================================
 */

/**
 * Importar archivo Excel/CSV de Koinor (LEGACY - usar importXmlFile para nuevas importaciones)
 * @param {File} file - Archivo a importar
 * @param {string} dateFrom - Fecha desde (opcional, YYYY-MM-DD)
 * @param {string} dateTo - Fecha hasta (opcional, YYYY-MM-DD)
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise<Object>} Resultado de la importación
 */
async function importFile(file, dateFrom = null, dateTo = null, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    if (dateFrom) formData.append('dateFrom', dateFrom);
    if (dateTo) formData.append('dateTo', dateTo);

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    };

    // Agregar callback de progreso si se proporciona
    if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
        };
    }

    const response = await apiClient.post('/billing/import', formData, config);
    return response.data;
}

/**
 * Importar archivo XML de Koinor (RECOMENDADO)
 * @param {File} file - Archivo XML a importar
 * @param {Function} onProgress - Callback de progreso (opcional)
 * @returns {Promise<Object>} Resultado de la importación
 */
async function importXmlFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    };

    // Agregar callback de progreso si se proporciona
    if (onProgress) {
        config.onUploadProgress = (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
        };
    }

    const response = await apiClient.post('/billing/import-xml', formData, config);
    return response.data;
}

/**
 * Obtener historial de importaciones
 * @param {Object} params - Parámetros de búsqueda
 * @param {number} params.page - Página
 * @param {number} params.limit - Límite
 * @returns {Promise<Object>} Lista de logs de importación
 */
async function getImportLogs(params = {}) {
    const response = await apiClient.get('/billing/import-logs', { params });
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 6: INTEGRACIÓN CON DOCUMENTOS
 * ============================================================================
 */

/**
 * Obtener estado de pago de un documento
 * @param {number|string} documentId - ID del documento
 * @returns {Promise<Object>} Estado de pago del documento
 */
async function getDocumentPaymentStatus(documentId) {
    try {
        const response = await apiClient.get(`/billing/documents/${documentId}/payment-status`);
        // Asegurar que devolvemos un objeto consistente
        return {
            success: true,
            data: response.data?.data || response.data
        };
    } catch (error) {
        console.error('billingService.getDocumentPaymentStatus error:', error);
        throw error;
    }
}

/**
 * ============================================================================
 * UTILIDADES
 * ============================================================================
 */

/**
 * Formatear estado de factura para UI
 * @param {string} status - Estado de la factura
 * @returns {Object} { label, color, icon }
 */
function formatInvoiceStatus(status) {
    const statusMap = {
        PAID: { label: 'Pagada', color: 'success', icon: '🟢' },
        PARTIAL: { label: 'Parcial', color: 'warning', icon: '🟡' },
        PENDING: { label: 'Pendiente', color: 'error', icon: '🔴' },
        OVERDUE: { label: 'Vencida', color: 'default', icon: '⚫' }
    };
    return statusMap[status] || { label: status, color: 'default', icon: '⚪' };
}

/**
 * Formatear moneda
 * @param {number} amount - Monto
 * @returns {string} Monto formateado
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-EC', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

/**
 * Formatear fecha
 * @param {string|Date} date - Fecha
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

/**
 * ============================================================================
 * SECCIÓN 7: CARTERA DE MATRIZADORES
 * ============================================================================
 */

/**
 * Obtener cartera del usuario actual (facturas de sus documentos asignados)
 * @param {Object} params - Parámetros de búsqueda
 * @returns {Promise<Object>} Lista de clientes con facturas pendientes
 */
async function getMyPortfolio(params = {}) {
    const response = await apiClient.get('/billing/my-portfolio', { params });
    return response.data;
}

/**
 * Generar mensaje de recordatorio de cobro para WhatsApp
 * @param {string} clientTaxId - Cédula o RUC del cliente
 * @param {string} phone - Número de teléfono (opcional, override del registrado)
 * @returns {Promise<Object>} Mensaje y URL de WhatsApp
 */
async function generateCollectionReminder(clientTaxId, phone) {
    const params = phone ? { phone } : {};
    const response = await apiClient.get(`/billing/collection-reminder/${encodeURIComponent(clientTaxId)}`, { params });
    return response.data;
}

/**
 * ============================================================================
 * SECCIÓN 8: REPORTES (Sprint 7)
 * ============================================================================
 */

/**
 * Obtener reporte de cartera por cobrar
 * @returns {Promise<Object>} Reporte agrupado por cliente
 */
async function getReporteCarteraPorCobrar() {
    const response = await apiClient.get('/billing/reports/cartera-por-cobrar');
    return response.data;
}

/**
 * Obtener reporte de pagos del período
 * @param {string} dateFrom - Fecha desde (YYYY-MM-DD)
 * @param {string} dateTo - Fecha hasta (YYYY-MM-DD)
 * @returns {Promise<Object>} Lista de pagos en el período
 */
async function getReportePagosDelPeriodo(dateFrom, dateTo) {
    const params = {};
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    const response = await apiClient.get('/billing/reports/pagos-periodo', { params });
    return response.data;
}

/**
 * Obtener reporte de facturas vencidas
 * @returns {Promise<Object>} Lista de facturas vencidas con días de mora
 */
async function getReporteFacturasVencidas() {
    const response = await apiClient.get('/billing/reports/facturas-vencidas');
    return response.data;
}

/**
 * Obtener reporte de entregas con saldo pendiente
 * @returns {Promise<Object>} Lista de documentos entregados con saldo pendiente
 */
async function getReporteEntregasConSaldo() {
    const response = await apiClient.get('/billing/reports/entregas-con-saldo');
    return response.data;
}

/**
 * ============================================================================
 * EXPORTAR SERVICIO
 * ============================================================================
 */

const billingService = {
    // Health y Dashboard
    healthCheck,
    getStats,
    getSummary,

    // Facturas
    getInvoices,
    getInvoiceById,
    getInvoicePayments,

    // Pagos
    getPayments,

    // Clientes
    getClients,
    getClientBalance,

    // Importación
    importFile,
    importXmlFile,
    getImportLogs,

    // Documentos
    getDocumentPaymentStatus,

    // Cartera de Matrizadores (Sprint 6)
    getMyPortfolio,
    generateCollectionReminder,

    // Reportes (Sprint 7)
    getReporteCarteraPorCobrar,
    getReportePagosDelPeriodo,
    getReporteFacturasVencidas,
    getReporteEntregasConSaldo,

    // Utilidades
    formatInvoiceStatus,
    formatCurrency,
    formatDate
};

export default billingService;

