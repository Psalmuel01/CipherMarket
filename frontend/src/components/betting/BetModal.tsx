'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Wallet, Sparkles, CheckCircle2, Loader2, Info } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import usePlaceBet from '@/hooks/usePlaceBet';
import { truncateAddress } from '@/lib/formatters';
import type { MarketOutcome } from '@/types/market';
import clsx from 'clsx';

export interface BetModalProps {
  marketAddress: `0x${string}`;
  open: boolean;
  outcome: MarketOutcome;
  onClose: () => void;
}

export default function BetModal({
  marketAddress,
  onClose,
  open,
  outcome,
}: BetModalProps): JSX.Element {
  const [amount, setAmount] = useState<string>('25');
  const { data, error, isError, isLoading, placeBet, reset } = usePlaceBet();

  const handleClose = (): void => {
    reset();
    onClose();
  };

  const steps = [
    { id: 'input', label: 'Input' },
    { id: 'encrypting', label: 'Encrypt' },
    { id: 'wallet', label: 'Confirm' },
    { id: 'success', label: 'Success' },
  ];

  const currentStepIndex = 
    data?.step === 'success' ? 3 :
    data?.step === 'awaiting_wallet' ? 2 :
    data?.step === 'encrypting' ? 1 : 0;

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title="Place Private Bet"
      description="Your position will be encrypted using Fhenix's confidential computing."
    >
      <div className="space-y-8 py-2">
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div className={clsx(
                "h-2 w-12 rounded-full transition-all duration-500",
                index <= currentStepIndex ? "bg-primary" : "bg-white/10"
              )} />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white/[0.03] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selected Outcome</p>
                <p className="text-xl font-black text-foreground">{outcome.label}</p>
              </div>
              <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
                <span>Network Fee</span>
                <span>~0.002 ETH</span>
              </div>
            </div>
            
            <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-3 text-[11px] font-bold text-primary/80">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p>Privacy Shield Active: Your stake and position remain fully encrypted until market resolution.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Stake Amount (ETH)</label>
              <span className="text-[10px] font-bold text-muted-foreground">Balance: 1,420 ETH</span>
            </div>
            <div className="relative">
              <input
                className="h-16 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-6 text-2xl font-black text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
                placeholder="0.00"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                <button className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-bold hover:bg-white/10">MAX</button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {data?.step === 'encrypting' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex items-center gap-4"
            >
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Encrypting position...</p>
                <p className="text-xs text-muted-foreground">Fhenix Confidential Runtime processing your stake.</p>
              </div>
            </motion.div>
          )}

          {data?.step === 'awaiting_wallet' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6 flex items-center gap-4"
            >
              <div className="flex h-12 flex-1 items-center px-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                <span className="flex-1 text-sm font-bold text-foreground">{amount || '0.00'}</span>
                <span className="text-xs font-black text-primary">ETH</span>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">Confirm in Wallet</p>
                <p className="text-xs text-muted-foreground">Please sign the transaction to submit your encrypted bet.</p>
              </div>
            </motion.div>
          )}

          {data?.step === 'success' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-2 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">Bet Placed Privately</p>
                  <p className="text-xs text-muted-foreground text-primary/80">Tx: {truncateAddress(data.txHash ?? marketAddress)}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isError && error && (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-bold text-destructive">
            {error.message}
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
          <Button className="flex-1" variant="outline" size="lg" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            size="lg"
            disabled={isLoading || data?.step === 'success'}
            onClick={() =>
              placeBet({
                amount,
                marketAddress,
                outcomeId: outcome.id,
              })
            }
            type="button"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isLoading ? 'Processing...' : 'Place Private Bet'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

