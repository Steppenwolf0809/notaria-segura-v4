// Archivo TypeScript de referencia. Implementación runtime en kpis-controller.js
export type Severidad = 'INFO' | 'WARN' | 'CRITICAL';
export interface AlertaItem { id: string; tipo: string; severidad: Severidad; documento_id?: string; detalle: string; creado_at: string | Date }

