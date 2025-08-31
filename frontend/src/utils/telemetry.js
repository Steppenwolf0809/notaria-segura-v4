// Utilidad mínima de telemetría/no-op para instrumentación ligera en frontend
// Evita romper el build si no hay proveedor de analítica configurado

export function markAction(actionName, metadata = {}) {
  try {
    // eslint-disable-next-line no-console
    console.debug('[telemetry] action:', actionName, metadata)
  } catch {}
}

export function markView(viewName, metadata = {}) {
  try {
    // eslint-disable-next-line no-console
    console.debug('[telemetry] view:', viewName, metadata)
  } catch {}
}

export default { markAction, markView }


