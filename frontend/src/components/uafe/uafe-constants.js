/**
 * UAFE Module Constants
 * Colors, states, catalogs, and configuration for the UAFE compliance module
 */

// ── Semaphore Colors ──────────────────────────────────────────────
export const SEMAFORO = {
  ROJO: {
    key: 'ROJO',
    color: '#c62828',
    bg: '#fce4ec',
    border: '#ef9a9a',
    label: 'Critico',
    description: 'Faltan datos obligatorios UAFE',
  },
  AMARILLO: {
    key: 'AMARILLO',
    color: '#e65100',
    bg: '#fff3e0',
    border: '#ffcc80',
    label: 'Pendiente',
    description: 'Datos parciales o falta No. protocolo',
  },
  VERDE: {
    key: 'VERDE',
    color: '#1b5e20',
    bg: '#e8f5e9',
    border: '#a5d6a7',
    label: 'Completo',
    description: 'Todos los datos listos para reporte',
  },
};

// ── Protocol States ───────────────────────────────────────────────
export const ESTADOS_PROTOCOLO = {
  BORRADOR: {
    key: 'BORRADOR',
    label: 'Borrador',
    color: '#78909c',
    bg: '#eceff1',
    order: 0,
    description: 'Minuta subida, datos parciales',
  },
  EN_PROCESO: {
    key: 'EN_PROCESO',
    label: 'En Proceso',
    color: '#1565c0',
    bg: '#e3f2fd',
    order: 1,
    description: 'Comparecientes llenando formularios',
  },
  PENDIENTE_PROTOCOLO: {
    key: 'PENDIENTE_PROTOCOLO',
    label: 'Pend. Protocolo',
    color: '#e65100',
    bg: '#fff3e0',
    order: 2,
    description: 'Falta solo No. protocolo',
  },
  COMPLETO: {
    key: 'COMPLETO',
    label: 'Completo',
    color: '#2e7d32',
    bg: '#e8f5e9',
    order: 3,
    description: 'Listo para reporte mensual',
  },
  REPORTADO: {
    key: 'REPORTADO',
    label: 'Reportado',
    color: '#4a148c',
    bg: '#f3e5f5',
    order: 4,
    description: 'Incluido en reporte mensual',
  },
};

export const ESTADOS_PROTOCOLO_FLOW = [
  'BORRADOR',
  'EN_PROCESO',
  'PENDIENTE_PROTOCOLO',
  'COMPLETO',
  'REPORTADO',
];

// ── Person Completeness States ────────────────────────────────────
export const ESTADOS_PERSONA = {
  pendiente: {
    key: 'pendiente',
    label: 'Sin datos',
    semaforo: 'ROJO',
  },
  incompleto: {
    key: 'incompleto',
    label: 'Incompleto',
    semaforo: 'AMARILLO',
  },
  completo: {
    key: 'completo',
    label: 'Completo',
    semaforo: 'VERDE',
  },
};

// ── Theme Colors ──────────────────────────────────────────────────
export const UAFE_COLORS = {
  primary: '#1e5a8e',
  primaryDark: '#0f3d66',
  primaryLight: '#e8f0f8',
  surface: '#f7f8fa',
  surfaceElevated: '#ffffff',
  textPrimary: '#1a2332',
  textSecondary: '#5f6b7a',
  textMuted: '#8e99a8',
  border: '#e2e6ec',
  borderLight: '#f0f2f5',
  divider: '#ebeef2',
  headerBg: '#0f1923',
  accent: '#ff6f00',
};

/** Theme-aware UAFE colors – use with useTheme() or pass isDark boolean */
export function getUAFEColors(isDark) {
  if (!isDark) return UAFE_COLORS;
  return {
    primary: '#5ba3d9',
    primaryDark: '#3d8ac4',
    primaryLight: 'rgba(30, 90, 142, 0.2)',
    surface: '#242830',
    surfaceElevated: '#2d333c',
    textPrimary: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    border: 'rgba(148, 163, 184, 0.15)',
    borderLight: 'rgba(148, 163, 184, 0.08)',
    divider: 'rgba(148, 163, 184, 0.1)',
    headerBg: '#0f1923',
    accent: '#ff9800',
  };
}

// ── UAFE Catalog: Tipos de Acto ──────────────────────────────────
export const TIPOS_ACTO_UAFE = [
  { codigo: '73', descripcion: 'COMPRAVENTA DE INMUEBLES' },
  { codigo: '74', descripcion: 'COMPRAVENTA DE VEHICULOS' },
  { codigo: '75', descripcion: 'DONACION DE INMUEBLES' },
  { codigo: '76', descripcion: 'DONACION DE VEHICULOS' },
  { codigo: '77', descripcion: 'PERMUTA DE INMUEBLES' },
  { codigo: '78', descripcion: 'PERMUTA DE VEHICULOS' },
  { codigo: '79', descripcion: 'DACION EN PAGO DE INMUEBLES' },
  { codigo: '80', descripcion: 'DACION EN PAGO DE VEHICULOS' },
  { codigo: '81', descripcion: 'APORTE A SOCIEDAD DE INMUEBLES' },
  { codigo: '82', descripcion: 'APORTE A SOCIEDAD DE VEHICULOS' },
  { codigo: '83', descripcion: 'FIDEICOMISO DE INMUEBLES' },
  { codigo: '84', descripcion: 'FIDEICOMISO DE VEHICULOS' },
  { codigo: '85', descripcion: 'PROMESA DE COMPRAVENTA DE INMUEBLES' },
  { codigo: '86', descripcion: 'CAPITULACIONES MATRIMONIALES' },
  { codigo: '87', descripcion: 'LIQUIDACION DE SOCIEDAD CONYUGAL' },
  { codigo: '88', descripcion: 'PARTICION DE BIENES' },
  { codigo: '89', descripcion: 'ADJUDICACION DE INMUEBLES' },
  { codigo: '90', descripcion: 'CESION DE DERECHOS HERENCIALES' },
  { codigo: '91', descripcion: 'CONSTITUCION DE PATRIMONIO FAMILIAR' },
  { codigo: '92', descripcion: 'HIPOTECA ABIERTA' },
  { codigo: '93', descripcion: 'OTROS ACTOS NOTARIALES SUJETOS A REPORTE' },
];

// ── UAFE Catalog: Tipos de Bien ──────────────────────────────────
export const TIPOS_BIEN = [
  { codigo: 'CAS', descripcion: 'Casa' },
  { codigo: 'DEP', descripcion: 'Departamento' },
  { codigo: 'TER', descripcion: 'Terreno' },
  { codigo: 'EDI', descripcion: 'Edificio' },
  { codigo: 'OFI', descripcion: 'Oficina' },
  { codigo: 'VEH', descripcion: 'Vehiculo' },
  { codigo: 'EMB', descripcion: 'Embarcacion' },
  { codigo: 'OTR', descripcion: 'Otro' },
];

// ── UAFE Catalog: Tipos de Identificacion ────────────────────────
export const TIPOS_IDENTIFICACION = [
  { codigo: 'C', descripcion: 'Cedula' },
  { codigo: 'R', descripcion: 'RUC' },
  { codigo: 'P', descripcion: 'Pasaporte' },
  { codigo: 'A', descripcion: 'Anonimo' },
];

// ── UAFE Catalog: Roles de Interviniente ─────────────────────────
export const ROLES_INTERVINIENTE = [
  { codigo: '01', descripcion: 'Otorgado por' },
  { codigo: '02', descripcion: 'A favor de' },
];

// ── UAFE Catalog: Calidades del Compareciente ────────────────────
export const CALIDADES_COMPARECIENTE = [
  'VENDEDOR',
  'COMPRADOR',
  'DONANTE',
  'DONATARIO',
  'PERMUTANTE',
  'DEUDOR',
  'ACREEDOR',
  'PROMITENTE_VENDEDOR',
  'PROMITENTE_COMPRADOR',
  'FIDEICOMITENTE',
  'FIDEICOMISARIO',
  'APORTANTE',
  'CESIONARIO',
  'CEDENTE',
  'ADJUDICATARIO',
  'OTRO',
];

// ── Formas de Pago ───────────────────────────────────────────────
export const FORMAS_PAGO = [
  { key: 'EFECTIVO', label: 'Efectivo' },
  { key: 'CHEQUE', label: 'Cheque' },
  { key: 'TRANSFERENCIA', label: 'Transferencia bancaria' },
  { key: 'TARJETA', label: 'Tarjeta de credito/debito' },
];

// ── Months ────────────────────────────────────────────────────────
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

// ── Helper: Get semaphore from completeness data ──────────────────
export function getSemaforoFromProtocol(protocol) {
  if (!protocol) return SEMAFORO.ROJO;

  const personas = protocol.personas || [];
  const hasProtocolNumber = !!protocol.numeroProtocolo;
  const hasTipoActo = !!protocol.tipoActo;
  const hasCuantia = protocol.valorContrato != null;

  // RED: Missing mandatory fields
  if (!hasTipoActo || !hasCuantia || personas.length === 0) {
    return SEMAFORO.ROJO;
  }

  // Check person completeness
  const allPersonsComplete = personas.every(
    (p) => p.estadoCompletitud === 'completo'
  );
  const somePersonsComplete = personas.some(
    (p) => p.estadoCompletitud === 'completo' || p.estadoCompletitud === 'incompleto'
  );

  // GREEN: Everything complete
  if (hasProtocolNumber && allPersonsComplete) {
    return SEMAFORO.VERDE;
  }

  // YELLOW: Partial data
  if (somePersonsComplete || hasProtocolNumber) {
    return SEMAFORO.AMARILLO;
  }

  return SEMAFORO.ROJO;
}

// ── Helper: Get missing fields for tooltip ────────────────────────
export function getMissingFields(protocol) {
  const missing = [];
  if (!protocol.tipoActo) missing.push('Tipo de acto');
  if (!protocol.valorContrato) missing.push('Cuantia');
  if (!protocol.numeroProtocolo) missing.push('No. protocolo');
  if (!protocol.personas?.length) missing.push('Comparecientes');

  const personas = protocol.personas || [];
  const pendingPersons = personas.filter((p) => p.estadoCompletitud !== 'completo');
  if (pendingPersons.length > 0) {
    pendingPersons.forEach((p) => {
      const nombre = p.nombre || p.nombreTemporal || p.personaCedula || 'Sin nombre';
      const campos = Array.isArray(p.camposFaltantes) && p.camposFaltantes.length > 0
        ? `: ${p.camposFaltantes.slice(0, 3).join(', ')}${p.camposFaltantes.length > 3 ? '...' : ''}`
        : '';
      missing.push(`${nombre}${campos}`);
    });
  }

  return missing;
}

// ── Format helpers ────────────────────────────────────────────────
export function formatCurrency(amount) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Guayaquil',
  }).format(new Date(dateStr));
}
