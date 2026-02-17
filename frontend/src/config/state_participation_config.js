/**
 * Configuración — Participación al Estado (Resolución 005-2023)
 * Consejo de la Judicatura
 *
 * FUENTE DE VERDAD: No hardcodear estos valores en componentes.
 * Para actualizar el SBU anual o las franjas, modificar SOLO este archivo.
 */

// ── Salario Básico Unificado — Año Fiscal 2026 ──
export const SBU_CURRENT = 482;

// ── Tabla Progresiva de Participación al Estado ──
// Cada objeto: { schema, lowerLimit, upperLimit, fixedSBU, variableRate }
// upperLimit = Infinity para el último tramo
export const TAX_BRACKETS = [
    { schema: 0, lowerLimit: 0, upperLimit: 5011.00, fixedSBU: 0, variableRate: 0.00 },
    { schema: 1, lowerLimit: 5011.01, upperLimit: 10000.00, fixedSBU: 2, variableRate: 0.15 },
    { schema: 2, lowerLimit: 10000.01, upperLimit: 20000.00, fixedSBU: 6, variableRate: 0.25 },
    { schema: 3, lowerLimit: 20000.01, upperLimit: 30000.00, fixedSBU: 14, variableRate: 0.30 },
    { schema: 4, lowerLimit: 30000.01, upperLimit: 40000.00, fixedSBU: 25, variableRate: 0.35 },
    { schema: 5, lowerLimit: 40000.01, upperLimit: 50000.00, fixedSBU: 38, variableRate: 0.40 },
    { schema: 6, lowerLimit: 50000.01, upperLimit: 60000.00, fixedSBU: 49, variableRate: 0.42 },
    { schema: 7, lowerLimit: 60000.01, upperLimit: 70000.00, fixedSBU: 62, variableRate: 0.44 },
    { schema: 8, lowerLimit: 70000.01, upperLimit: 80000.00, fixedSBU: 76, variableRate: 0.46 },
    { schema: 9, lowerLimit: 80000.01, upperLimit: 90000.00, fixedSBU: 90, variableRate: 0.48 },
    { schema: 10, lowerLimit: 90000.01, upperLimit: Infinity, fixedSBU: 108, variableRate: 0.51 },
];

// ── Estados de Alerta (Máquina de Estados por día del mes) ──
export const ALERT_STATES = {
    NORMAL: { minDay: 1, maxDay: 7, status: 'normal', color: '#0284c7', label: 'En proceso' },
    CRITICAL: { minDay: 8, maxDay: 9, status: 'critical', color: '#ea580c', label: 'Urgente' },
    DEADLINE: { minDay: 10, maxDay: 10, status: 'deadline', color: '#dc2626', label: 'Último día' },
    OVERDUE: { minDay: 11, maxDay: 31, status: 'overdue', color: '#991b1b', label: 'En mora' },
};

// ── Tasa de Multa por Mora ──
export const PENALTY_RATE = 0.03; // 3%

// ── Tipos de documentos requeridos para el vault ──
export const REQUIRED_DOCUMENTS = [
    {
        id: 'resumen_liquidacion',
        label: 'Resumen de Liquidación',
        fileName: 'Resumen_Liquidacion',
        accept: { 'application/pdf': ['.pdf'] },
    },
    {
        id: 'comprobante_transferencia',
        label: 'Comprobante de Transferencia',
        fileName: 'Comprobante_Transferencia',
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
        },
    },
];
