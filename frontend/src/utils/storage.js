// Utilidades seguras para localStorage + helpers de tema

export const storageAvailable = (() => {
  try {
    const x = '__storage_test__';
    window.localStorage.setItem(x, x);
    window.localStorage.removeItem(x);
    return true;
  } catch {
    return false;
  }
})();

export function getItem(key, defaultValue = null) {
  if (!storageAvailable) return defaultValue;
  try {
    const v = window.localStorage.getItem(key);
    return v !== null ? v : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setItem(key, value) {
  if (!storageAvailable) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getJSON(key, defaultValue = null) {
  const v = getItem(key, null);
  if (v === null) return defaultValue;
  try {
    return JSON.parse(v);
  } catch {
    return defaultValue;
  }
}

export function setJSON(key, obj) {
  try {
    return setItem(key, JSON.stringify(obj));
  } catch {
    return false;
  }
}

// Helpers específicos de tema
const THEME_KEY = 'theme'; // requerido: persistir en localStorage('theme')

export function getTheme() {
  return getItem(THEME_KEY, 'system'); // valores esperados: 'light' | 'dark' | 'system'
}

export function setTheme(mode) {
  return setItem(THEME_KEY, mode);
}