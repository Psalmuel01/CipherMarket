'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import useBuyShares from '@/hooks/useBuyShares';
import useMarketQuote from '@/hooks/useMarketQuote';
import useSellShares from '@/hooks/useSellShares';
import { formatAmount, truncateAddress } from '@/lib/formatters';
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
}: BetModalProps): JSX.Element {
  const [amount, setAmount] = useState<string>('1');
  const { data: buyState, error: buyError, isError: isBuyError, isLoading: isBuyLoading, buyShares, reset } =
    useBuyShares();
  const {
    data: sellState,
    error: sellError,
    isError: isSellError,
    isLoading: isSellLoading,
    sellShares,
    reset: resetSellState,
  } = useSellShares();
  const quote = useMarketQuote({
    marketId,
    outcomeIndex: outcome.outcomeIndex,
    amount,
    decimals: collateralDecimals,
    side,
  });

  const transactionState = side === 'BUY' ? buyState : sellState;
  const isLoading = side === 'BUY' ? isBuyLoading : isSellLoading;
  const error = side === 'BUY' ? buyError : sellError;
  const isError = side === 'BUY' ? isBuyError : isSellError;

  const handleClose = (): void => {
    reset();
    resetSellState();
    onClose();
  };

  const handleSubmit = async (): Promise<void> => {
    if (!quote.data) {
      return;
    }

    if (side === 'BUY') {
      await buyShares({
        amount,
        marketId,
        marketTitle,
        outcomeId: outcome.id,
        collateralToken,
        collateralSymbol,
        collateralDecimals,
        minAmountOut: quote.data.sharesAmount,
      });
      return;
    }

    await sellShares({
      amount,
      marketId,
      marketTitle,
      outcomeId: outcome.id,
      collateralToken,
      collateralSymbol,
      collateralDecimals,
      minAmountOut: quote.data.collateralAmount,
    });
  };

  const steps = [
    { id: 'input', label: 'Input' },
    { id: 'quote', label: 'Quote' },
    { id: 'wallet', label: 'Confirm' },
    { id: 'success', label: 'Success' },
  ];

  const currentStepIndex =
    transactionState?.step === 'success'
      ? 3
      : transactionState?.step === 'awaiting_wallet'
        ? 2
        : transactionState?.step === 'encrypting'
          ? 1
          : 0;

  return (
    <Modal
      onClose={handleClose}
      open={open}
      title={side === 'BUY' ? 'Buy Outcome Shares' : 'Sell Outcome Shares'}
      description="The trade remains understandable even when your resulting position stays private."
    >
      <div className="space-y-8 py-2">
        <div className="flex items-center justify-between px-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-2">
              <div
                className={clsx(
                  'h-2 w-12 rounded-full transition-all duration-500',
                  index <= currentStepIndex ? 'bg-primary' : 'bg-white/10',
                )}
              />
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="space-y-3 rounded-2xl bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Selected Outcome
                </p>
                <p className="text-xl font-semibold text-foreground">{outcome.label}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-primary">{outcome.impliedShare}%</p>
                <p className="text-xs text-muted-foreground">Current market probability</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-3 text-[11px] text-primary/80">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <p>
                {side === 'BUY'
                  ? 'Estimating secure trade path. The quote is public; your resulting position is not.'
                  : 'Preparing exit quote. Final execution may move slightly if market state changes before confirmation.'}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                {side === 'BUY' ? `Collateral (${collateralSymbol})` : 'Shares to sell'}
              </label>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Market #{marketId}
              </span>
            </div>
            <div className="relative">
              <input
                className="h-16 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-6 font-mono text-2xl font-semibold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                onChange={(event) => setAmount(event.target.value)}
                value={amount}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-primary" />
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Quote Preview
              </p>
            </div>

            {quote.isLoading ? (
              <p className="text-sm text-muted-foreground">Estimating...</p>
            ) : quote.data ? (
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {side === 'BUY' ? 'Shares received' : 'Collateral received'}
                  </p>
                  <p className="font-mono text-foreground">
                    {formatAmount(
                      side === 'BUY' ? quote.data.sharesAmount : quote.data.collateralAmount,
                      collateralDecimals,
                    )}{' '}
                    {side === 'BUY' ? 'shares' : collateralSymbol}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Average price
                  </p>
                  <p className="font-mono text-foreground">{Number(quote.data.averagePrice) / 1e16}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Fee
                  </p>
                  <p className="font-mono text-foreground">
                    {formatAmount(quote.data.feeAmount, collateralDecimals)} {collateralSymbol}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Slippage
                  </p>
                  <p className="font-mono text-foreground">{quote.data.slippageBps / 100}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter an amount to estimate, decrypt, and prepare the secure trade.
              </p>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {transactionState?.step === 'encrypting' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="flex gap-1.5">
                  <span className="h-9 w-2 animate-pulse rounded-full bg-primary/30 [animation-delay:0ms]" />
                  <span className="h-9 w-2 animate-pulse rounded-full bg-primary/45 [animation-delay:120ms]" />
                  <span className="h-9 w-2 animate-pulse rounded-full bg-primary/60 [animation-delay:240ms]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Finalizing secure computation...</p>
                  <p className="text-xs text-muted-foreground">
                    Encrypting your resulting position before network submission.
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {transactionState?.step === 'awaiting_wallet' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6"
            >
              <p className="text-sm font-semibold text-foreground">Confirm in Wallet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review the order, then sign to send the transaction on-chain.
              </p>
            </motion.div>
          ) : null}

          {transactionState?.step === 'success' || ('txHash' in (transactionState ?? {}) && transactionState?.txHash) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-3"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/20 p-2 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {side === 'BUY' ? 'Shares bought' : 'Shares sold'}
                  </p>
                  <p className="font-mono text-xs text-primary/80">
                    Tx: {truncateAddress(transactionState?.txHash ?? collateralToken)}
                  </p>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {isError && error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive">
            {error.message}
          </div>
        ) : null}

        <div className="flex items-center gap-4 border-t border-white/5 pt-4">
          <Button className="flex-1" variant="outline" size="lg" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            size="lg"
            disabled={!quote.data || isLoading}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Processing...' : side === 'BUY' ? 'Buy Shares' : 'Sell Shares'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
