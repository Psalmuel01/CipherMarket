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
  lastBetAmount: string;
  lastBetOutcome: string;
  setPlacedBet: (placed: boolean, amount?: string, outcome?: string) => void;
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
  lastBetAmount: '0',
  lastBetOutcome: '',
  setPlacedBet: (placed, amount = '500', outcome = 'YES') => 
    set({ hasPlacedBet: placed, lastBetAmount: amount, lastBetOutcome: outcome }),
  hasResolved: false,
  setResolved: (resolved) => set({ hasResolved: resolved }),
  hasClaimed: false,
  setClaimed: (claimed) => set({ hasClaimed: claimed }),
}));
