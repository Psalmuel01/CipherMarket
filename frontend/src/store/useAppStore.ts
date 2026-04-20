import { create } from 'zustand';
import type { MarketLifecycle } from '@/types/market';

interface AppState {
  activeStatusFilter: MarketLifecycle | 'ALL';
  isSidebarOpen: boolean;
  isPortfolioVisible: boolean;
  setActiveStatusFilter: (status: MarketLifecycle | 'ALL') => void;
  setSidebarOpen: (open: boolean) => void;
  setPortfolioVisible: (visible: boolean) => void;
  togglePortfolioVisible: () => void;
}

const useAppStore = create<AppState>((set) => ({
  activeStatusFilter: 'ALL',
  isSidebarOpen: false,
  isPortfolioVisible: false,
  setActiveStatusFilter: (status) => set({ activeStatusFilter: status }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setPortfolioVisible: (visible) => set({ isPortfolioVisible: visible }),
  togglePortfolioVisible: () =>
    set((state) => ({ isPortfolioVisible: !state.isPortfolioVisible })),
}));

export default useAppStore;
