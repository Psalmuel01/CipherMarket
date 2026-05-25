'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { zeroAddress } from 'viem';
import {
  ArrowUpDown,
  Sparkles,
  ShieldCheck,
  Ticket,
  Info,
  ChevronRight,
  TrendingUp,
  Coins
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PrivacyBadge from '@/components/ui/PrivacyBadge';
import TransactionFlow from '@/components/betting/TransactionFlow';
import useBuyShares from '@/hooks/useBuyShares';
import useMarketQuote from '@/hooks/useMarketQuote';
import useSellShares from '@/hooks/useSellShares';
import { formatAmount } from '@/lib/formatters';
import type { MarketOutcome } from '@/types/market';
import clsx from 'clsx';

export interface BetModalProps {
  marketId: number;
  marketTitle: string;
  collateralToken: `0x${string}`;
  collateralSymbol: string;
  collateralDecimals: number;
  open: boolean;
  outcome: MarketOutcome;
  side: 'BUY' | 'SELL';
  onClose: () => void;
  userShares?: bigint;
}

export default function BetModal({
  marketId,
  marketTitle,
  collateralDecimals,
  collateralSymbol,
  collateralToken,
  onClose,
  open,
  outcome,
  side,
  userShares,
}: BetModalProps): JSX.Element {
  const [amount, setAmount] = useState<string>('1');
  const buyHook = useBuyShares();
  const sellHook = useSellShares();

  const activeHook = side === 'BUY' ? buyHook : sellHook;
  const { state, buyShares, sellShares, reset } = (side === 'BUY' ? buyHook : sellHook) as any;
  const isNativeCollateral = collateralToken.toLowerCase() === zeroAddress;

  const quote = useMarketQuote({
    marketId,
    outcomeIndex: outcome.outcomeIndex,
    amount,
    decimals: collateralDecimals,
    side,
  });

  const maxSharesFormatted =
    side === 'SELL' && userShares != null
      ? formatAmount(userShares, collateralDecimals)
      : null;

  const exceedsMax = (() => {
    if (side !== 'SELL' || userShares == null) return false;
    try {
      const parsed = parseFloat(amount || '0');
      const maxParsed = parseFloat(formatAmount(userShares, collateralDecimals).replace(/,/g, ''));
      return parsed > maxParsed;
    } catch {
      return false;
    }
  })();

  const handleSetMax = (): void => {
    if (side === 'SELL' && userShares != null) {
      const formatted = formatAmount(userShares, collateralDecimals);
      setAmount(formatted.replace(/,/g, ''));
    }
  };

  const handleClose = (): void => {
    reset();
    setAmount('1');
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!quote.data) return;

    if (side === 'BUY') {
      await buyShares({
        amount,
        marketId,
        marketTitle,
        outcomeId: outcome.id,
        outcomeLabel: outcome.label,
        collateralToken,
        collateralSymbol,
        collateralDecimals,
        minAmountOut: quote.data.sharesAmount,
      });
    } else {
      await sellShares({
        amount,
        marketId,
        marketTitle,
        outcomeId: outcome.id,
        outcomeLabel: outcome.label,
        collateralToken,
        collateralSymbol,
        collateralDecimals,
        minAmountOut: quote.data.collateralAmount,
      });
    }
  };

  const steps = [
    { id: 'input', label: 'Draft', description: 'Enter trade details' },
    { id: 'prepare', label: 'Prepare', description: 'Encrypting inputs' },
    ...(side === 'BUY' && !isNativeCollateral
      ? [{ id: 'approval', label: 'Approve', description: 'Token allowance' }]
      : []),
    { id: 'confirm', label: 'Execute', description: 'Confirm in wallet' },
    { id: 'success', label: 'Complete', description: 'Trade settled' },
  ];

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={side === 'BUY' ? 'Buy Shares' : 'Sell Shares'}
      description={state.stage === 'idle' ? "Secure computation ensures your resulting position remains private." : ""}
      size="lg"
    >
      <TransactionFlow
        state={state}
        steps={steps}
        successTitle={side === 'BUY' ? 'Shares Purchased!' : 'Shares Sold!'}
        successDescription={
          side === 'BUY'
            ? `Successfully acquired ${outcome.label} shares in ${marketTitle}.`
            : `Successfully sold ${outcome.label} shares in ${marketTitle}.`
        }
        onClose={handleClose}
        onRetry={handleSubmit}
      >
        <div className="space-y-8 py-2">
          {/* Market Context Header */}
          <div className="relative overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.01] p-6 space-y-3">
            <div className="absolute top-0 right-0 p-4">
              <PrivacyBadge state="sealed" size="sm" />
            </div>

            <div className="space-y-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-white/20">Selected Position</p>
              <h3 className="text-3xl font-serif italic text-white tracking-tight">
                {outcome.label}
              </h3>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-white/5">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-white/20">
                  <TrendingUp className="h-3 w-3" /> Implied
                </div>
                <p className="text-sm font-bold text-primary">{outcome.impliedShare}%</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest text-white/20">
                  <Coins className="h-3 w-3" /> Asset
                </div>
                <p className="text-sm font-bold text-white/60">{collateralSymbol}</p>
              </div>
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/20">
                {side === 'BUY' ? `Deposit (${collateralSymbol})` : 'Shares to sell'}
              </label>
              {side === 'SELL' && maxSharesFormatted && (
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="px-3 py-1 rounded-full border border-primary/20 bg-primary/5 font-mono text-[9px] uppercase tracking-widest text-primary hover:bg-primary/10 transition-all active:scale-95"
                >
                  Max: {maxSharesFormatted}
                </button>
              )}
            </div>

            <div className="relative group">
              <div className="absolute -inset-0.5 bg-primary/20 rounded-[24px] blur opacity-0 group-focus-within:opacity-30 transition-opacity" />
              <input
                className={clsx(
                  "relative h-20 w-full rounded-[24px] border bg-[#0d1017] px-8 font-mono text-3xl font-bold text-white outline-none transition-all",
                  exceedsMax
                    ? "border-red-500/50 focus:border-red-500"
                    : "border-white/5 focus:border-primary/50"
                )}
                onChange={(e) => setAmount(e.target.value)}
                value={amount}
                placeholder="0.00"
                autoFocus
              />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 font-mono text-lg text-white/10 select-none">
                {side === 'BUY' ? collateralSymbol : 'SHARES'}
              </div>
            </div>

            <AnimatePresence>
              {exceedsMax && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-[11px] text-red-400 px-4 font-bold uppercase tracking-widest"
                >
                  Insufficient Balance
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Quote Section */}
          <div className="rounded-[32px] border border-white/5 bg-white/[0.01] p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-primary" />
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/20">Execution Intelligence</p>
              </div>
              {!quote.isLoading && quote.data && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-bold text-emerald-500 font-mono uppercase tracking-widest">Valid</span>
                </div>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {quote.isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-2 w-16 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                  </div>
                ))
              ) : quote.data ? (
                <>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/15 font-mono">
                      {side === 'BUY' ? 'Est. received' : 'Est. return'}
                    </p>
                    <p className="text-base font-bold text-white tracking-tight">
                      {formatAmount(
                        side === 'BUY' ? quote.data.sharesAmount : quote.data.collateralAmount,
                        collateralDecimals,
                      )}{' '}
                      <span className="text-[10px] text-white/30 font-light">{side === 'BUY' ? 'shares' : collateralSymbol}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/15 font-mono">Avg Price</p>
                    <p className="text-base font-bold text-white tracking-tight">
                      {(Number(quote.data.averagePrice) / 1e16).toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/15 font-mono">Protocol Fee</p>
                    <p className="text-base font-bold text-white/60 tracking-tight">
                      {formatAmount(quote.data.feeAmount, collateralDecimals)} <span className="text-[10px] font-light">{collateralSymbol}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/15 font-mono">Impact</p>
                    <p className="text-base font-bold text-amber-400/80 tracking-tight">
                      {((quote.data.slippageBps || 0) / 100).toFixed(2)}%
                    </p>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 py-4 flex items-center justify-center gap-3 border border-dashed border-white/5 rounded-2xl">
                  <Info className="h-4 w-4 text-white/10" />
                  <p className="text-[11px] text-white/20 italic font-light">
                    Enter trade size to generate execution quote.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-4 pt-4">
            <Button
              className="flex-1"
              variant="secondary"
              onClick={handleClose}
              disabled={state.stage !== 'idle'}
            >
              Cancel
            </Button>
            <Button
              className="flex-[2] gap-3"
              disabled={!quote.data || exceedsMax || state.stage !== 'idle'}
              onClick={handleSubmit}
            >
              <Sparkles className="h-4 w-4" />
              <span>
                {side === 'BUY' ? 'Confirm Purchase' : 'Confirm Sale'}
              </span>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </Button>
          </div>
        </div>
      </TransactionFlow>
    </Modal>
  );
}
