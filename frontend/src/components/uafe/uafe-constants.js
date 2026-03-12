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
// Catálogo oficial UAFE — fuente: Catalogo-Notarios.xls, hoja Tipo_Transacción
export const TIPOS_ACTO_UAFE = [
  { codigo: '73', descripcion: 'PROMESA DE CELEBRAR CONTRATOS' },
  { codigo: '74', descripcion: 'COMPRAVENTA' },
  { codigo: '75', descripcion: 'COMPRAVENTA DE INMUEBLES FINANCIADAS CON EL BONO QUE OTORGA EL ESTADO A TRAVES DEL MIDUVI' },
  { codigo: '76', descripcion: 'TRANSFERENCIA DE DOMINIO CON CONSTITUCION DE HIPOTECA' },
  { codigo: '77', descripcion: 'CONSTITUCION DE HIPOTECA' },
  { codigo: '78', descripcion: 'CONSTITUCION DE HIPOTECA A FAVOR DEL BIESS - ISSFA - ISSPOL - MUNICIPALIDADES - MUTUALISTAS O COOPERATIVAS DE AHORRO Y CREDITO PARA LA VIVIENDA' },
  { codigo: '79', descripcion: 'CONSTITUCION DE HIPOTECA ABIERTA' },
  { codigo: '80', descripcion: 'CONSTITUCION DE HIPOTECA EN LA QUE INTERVENGA EL MIDUVI' },
  { codigo: '81', descripcion: 'DONACION' },
  { codigo: '82', descripcion: 'PERMUTA' },
  { codigo: '83', descripcion: 'LIQUIDACION DE LA SOCIEDAD CONYUGAL' },
  { codigo: '84', descripcion: 'LIQUIDACION DE LA SOCIEDAD DE BIENES' },
  { codigo: '85', descripcion: 'DACION EN PAGO' },
  { codigo: '86', descripcion: 'CESION DE DERECHOS ONEROSOS' },
  { codigo: '87', descripcion: 'COMODATO' },
  { codigo: '88', descripcion: 'CONSTITUCION DE CONSORCIOS CON CUANTIA DETERMINADA' },
  { codigo: '89', descripcion: 'TRASPASO DE UN CREDITO CON CUANTIA' },
  { codigo: '90', descripcion: 'CESION DE PARTICIPACIONES' },
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

// ── UAFE Catalog: Papeles del Interviniente (Catalogo-Notarios.xls) ──
// Los papeles disponibles dependen del tipo de transacción
export const PAPELES_INTERVINIENTE = [
  { codigo: '01', nombre: 'ACCIONISTA' },
  { codigo: '02', nombre: 'ACREEDOR(A)', actos: ['85'] },
  { codigo: '03', nombre: 'ACREEDOR(A) HIPOTECARIO(A)', actos: ['77', '76'] },
  { codigo: '07', nombre: 'ADJUDICATARIO(A)' },
  { codigo: '08', nombre: 'ADJUDICATARIO(A) DEUDOR(A) HIPOTECARIO(A)', actos: ['76'] },
  { codigo: '09', nombre: 'APODERADO(A)' },
  { codigo: '10', nombre: 'APODERADO(A) ESPECIAL' },
  { codigo: '11', nombre: 'APODERADO(A) GENERAL' },
  { codigo: '15', nombre: 'CEDENTE', actos: ['90', '86'] },
  { codigo: '16', nombre: 'CESIONARIO(A)', actos: ['90', '86'] },
  { codigo: '18', nombre: 'COMODANTE', actos: ['87'] },
  { codigo: '19', nombre: 'COMODATARIO(A)', actos: ['87'] },
  { codigo: '20', nombre: 'COMPRADOR(A)', actos: ['74'] },
  { codigo: '21', nombre: 'COMPRADOR(A)-DEUDOR(A)' },
  { codigo: '22', nombre: 'COMPRADOR(A)-DEUDOR(A)-HIPOTECARIO(A)', actos: ['76'] },
  { codigo: '24', nombre: 'COMPARECIENTE', actos: ['83', '84'] },
  { codigo: '29', nombre: 'DEUDOR(A) HIPOTECARIO(A)', actos: ['77', '78'] },
  { codigo: '31', nombre: 'DEUDOR(A) PRINCIPAL', actos: ['85', '78'] },
  { codigo: '32', nombre: 'DONANTE', actos: ['81'] },
  { codigo: '33', nombre: 'DONATARIO(A)', actos: ['81'] },
  { codigo: '42', nombre: 'MANDANTE' },
  { codigo: '43', nombre: 'MANDATARIO(A)' },
  { codigo: '45', nombre: 'PERMUTANTE', actos: ['82'] },
  { codigo: '52', nombre: 'PROMITENTE COMPRADOR(A)', actos: ['73'] },
  { codigo: '55', nombre: 'PROMITENTE VENDEDOR(A)', actos: ['73'] },
  { codigo: '57', nombre: 'REPRESENTANTE LEGAL' },
  { codigo: '63', nombre: 'VENDEDOR(A)', actos: ['74', '76'] },
];

// Calidades simples para el formulario del matrizador
export const CALIDADES_COMPARECIENTE = [
  'VENDEDOR',
  'COMPRADOR',
  'DONANTE',
  'DONATARIO',
  'PERMUTANTE',
  'DEUDOR_HIPOTECARIO',
  'ACREEDOR_HIPOTECARIO',
  'PROMITENTE_VENDEDOR',
  'PROMITENTE_COMPRADOR',
  'CEDENTE',
  'CESIONARIO',
  'COMPARECIENTE',
  'COMODANTE',
  'COMODATARIO',
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
