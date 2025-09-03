import { useCallback, useEffect, useMemo, useState } from 'react';
import { todayStr, addDaysStr } from '../utils/dateTZ';
import { fetchGeneral, fetchProductivity, fetchFinancial, fetchAlerts } from '../services/kpisApi';
import useAdminKpisStore from '../state/adminKpisStore';

interface Params { days?: number }

export default function useAdminKpis({ days = 7 }: Params = {}) {
  const { general, productivity, financial, alerts, lastUpdated, setData } = useAdminKpisStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const to = useMemo(() => todayStr(), [days]);
  const from = useMemo(() => addDaysStr(to, -days + 1), [days, to]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [g, p, f, a] = await Promise.all([
        fetchGeneral(from, to),
        fetchProductivity(from, to, 10),
        fetchFinancial(from, to, days > 7 ? 'day' : 'day'),
        fetchAlerts(100),
      ]);
      setData({ general: g, productivity: p, financial: f, alerts: a, lastUpdated: Date.now() });
    } catch (e: any) {
      setError(e?.message || 'Error cargando KPIs');
    } finally {
      setLoading(false);
    }
  }, [from, to, days, setData]);

  useEffect(() => { load(); }, [load]);

  // Polling cada 5 min
  useEffect(() => {
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  return { general, productivity, financial, alerts, loading, error, lastUpdated, refresh: load };
}

