// Utilidad de flags de UI
// Lee de import.meta.env y permite override opcional vía localStorage ("flags:<KEY>" = "true"/"false")
export function readFlag(key, defaultValue = false) {
  try {
    // 1) LocalStorage override (útil para pruebas)
    const ls = localStorage.getItem(`flags:${key}`);
    if (typeof ls === 'string') {
      const v = ls.trim().toLowerCase();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
  } catch {}

  try {
    // 2) Variables Vite
    const raw = import.meta?.env?.[key];
    if (typeof raw === 'string') {
      const v = raw.trim().toLowerCase();
      if (v === 'true') return true;
      if (v === 'false') return false;
    }
  } catch {}

  return !!defaultValue;
}

export default readFlag;