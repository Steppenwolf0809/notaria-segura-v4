/// <reference types="vite/client" />
// Utilidad de Feature Flags basada en variables Vite (import.meta.env)
// Expone un objeto FLAGS tipado y seguro para consumo en toda la app

type BooleanLike = boolean | string | number | undefined | null;

function toBool(value: BooleanLike, defaultValue: boolean): boolean {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const v = String(value).toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on' || v === 'enabled';
}

export interface Flags {
  DOCS_MATRIZADOR_TABS: boolean;
  DOCS_ARCHIVO_TABS: boolean;
  DOCS_RECEPCION_GROUPED: boolean;
  DOCS_LAZY_DELIVERED: boolean;
  DOCS_WINDOWING: boolean;
  DOCS_SEARCH_SMART_SCOPE: boolean;
  DOCS_SEARCH_TOGGLE_RECEPCION: boolean;
}

const FLAGS: Flags = {
  DOCS_MATRIZADOR_TABS: toBool(import.meta.env?.VITE_DOCS_MATRIZADOR_TABS, true),
  DOCS_ARCHIVO_TABS: toBool(import.meta.env?.VITE_DOCS_ARCHIVO_TABS, true),
  DOCS_RECEPCION_GROUPED: toBool(import.meta.env?.VITE_DOCS_RECEPCION_GROUPED, true),
  DOCS_LAZY_DELIVERED: toBool(import.meta.env?.VITE_DOCS_LAZY_DELIVERED, true),
  DOCS_WINDOWING: toBool(import.meta.env?.VITE_DOCS_WINDOWING, false),
  DOCS_SEARCH_SMART_SCOPE: toBool(import.meta.env?.VITE_DOCS_SEARCH_SMART_SCOPE, true),
  DOCS_SEARCH_TOGGLE_RECEPCION: toBool(import.meta.env?.VITE_DOCS_SEARCH_TOGGLE_RECEPCION, true),
};

export { FLAGS };


