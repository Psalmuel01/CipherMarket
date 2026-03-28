import { create } from 'zustand';
import type { MarketLifecycle } from '@/types/market';

interface AppState {
  activeStatusFilter: MarketLifecycle | 'ALL';
  isSidebarOpen: boolean;
  setActiveStatusFilter: (status: MarketLifecycle | 'ALL') => void;
  setSidebarOpen: (open: boolean) => void;
}

const useAppStore = create<AppState>((set) => ({
  activeStatusFilter: 'ALL',
  isSidebarOpen: false,
  setActiveStatusFilter: (status) => set({ activeStatusFilter: status }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
}));

export default useAppStore;

