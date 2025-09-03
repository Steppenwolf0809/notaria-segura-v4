import useAuthStore from '../../../store/auth-store';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

export async function fetchGeneral(from: string, to: string) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/admin/kpis/general?from=${from}&to=${to}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error cargando KPIs generales');
  const json = await res.json();
  return json.data;
}

export async function fetchProductivity(from: string, to: string, limit = 10) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/admin/kpis/productivity?from=${from}&to=${to}&limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error cargando productividad');
  const json = await res.json();
  return json.data;
}

export async function fetchFinancial(from: string, to: string, granularity: 'day'|'week'|'month' = 'day') {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/admin/kpis/financial?from=${from}&to=${to}&granularity=${granularity}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error cargando finanzas');
  const json = await res.json();
  return json.data;
}

export async function fetchAlerts(limit = 100) {
  const token = useAuthStore.getState().token;
  const res = await fetch(`${API_BASE_URL}/admin/kpis/alerts?limit=${limit}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error cargando alertas');
  const json = await res.json();
  return json.data;
}

export default { fetchGeneral, fetchProductivity, fetchFinancial, fetchAlerts };

