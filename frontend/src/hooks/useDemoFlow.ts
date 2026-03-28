import { create } from 'zustand';

export type DemoStep = 'CONNECT' | 'CREATE' | 'BET' | 'RESOLVE' | 'CLAIM';

interface DemoFlowStore {
  currentStep: DemoStep;
  setStep: (step: DemoStep) => void;
  isWalletConnected: boolean;
  setWalletConnected: (connected: boolean) => void;
  hasCreatedMarket: boolean;
  setCreatedMarket: (created: boolean) => void;
  hasPlacedBet: boolean;
  setPlacedBet: (placed: boolean) => void;
  hasResolved: boolean;
  setResolved: (resolved: boolean) => void;
  hasClaimed: boolean;
  setClaimed: (claimed: boolean) => void;
}

export const useDemoFlow = create<DemoFlowStore>((set) => ({
  currentStep: 'CONNECT',
  setStep: (step) => set({ currentStep: step }),
  isWalletConnected: false,
  setWalletConnected: (connected) => set({ isWalletConnected: connected }),
  hasCreatedMarket: false,
  setCreatedMarket: (created) => set({ hasCreatedMarket: created }),
  hasPlacedBet: false,
  setPlacedBet: (placed) => set({ hasPlacedBet: placed }),
  hasResolved: false,
  setResolved: (resolved) => set({ hasResolved: resolved }),
  hasClaimed: false,
  setClaimed: (claimed) => set({ hasClaimed: claimed }),
}));
