import { create } from 'zustand';

interface AdminKpisState {
  general: any | null;
  productivity: any | null;
  financial: any | null;
  alerts: any[];
  lastUpdated: number | null;
  setData: (p: Partial<AdminKpisState>) => void;
}

const useAdminKpisStore = create<AdminKpisState>((set) => ({
  general: null,
  productivity: null,
  financial: null,
  alerts: [],
  lastUpdated: null,
  setData: (p) => set(p),
}));

export default useAdminKpisStore;

