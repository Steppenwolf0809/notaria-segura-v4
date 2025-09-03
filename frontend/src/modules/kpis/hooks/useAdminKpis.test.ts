// Nota: entorno actual no configura runner de tests en frontend.
// Este archivo actúa como placeholder/documentación para futuras pruebas con Vitest/Jest.
import { todayStr, addDaysStr } from '../utils/dateTZ';

function testDateHelpers() {
  const t = todayStr();
  const prev = addDaysStr(t, -7);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('todayStr formato inválido');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prev)) throw new Error('addDaysStr formato inválido');
}

testDateHelpers();

