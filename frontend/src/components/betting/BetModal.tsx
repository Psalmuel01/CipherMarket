'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Tooltip from '@/components/ui/Tooltip';
import usePlaceBet from '@/hooks/usePlaceBet';
import { truncateAddress } from '@/lib/formatters';
import type { MarketOutcome } from '@/types/market';

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

  return (
    <Modal
      description="Encrypted stake entry with a clean four-step confirmation flow."
      onClose={handleClose}
      open={open}
      title="Place Private Bet"
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-teal/20 bg-teal/8 p-4 text-sm text-text">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal">Outcome</p>
          <p className="mt-2 text-base">{outcome.label}</p>
          <Tooltip label="Your position will be encrypted and not publicly visible on-chain.">
            <p className="mt-3 text-sm text-muted">
              Your position will be encrypted and not visible on-chain.
            </p>
          </Tooltip>
        </div>

        <label className="block space-y-2">
          <span className="text-xs uppercase tracking-[0.18em] text-muted">Stake Amount</span>
          <input
            className="w-full rounded-xl border border-line bg-surface px-4 py-4 font-mono text-xl text-text outline-none transition-colors focus:border-teal/35"
            onChange={(event) => setAmount(event.target.value)}
            value={amount}
          />
        </label>

        <div className="rounded-2xl border border-line bg-surface/70 p-4">
          <div className="grid gap-3 text-sm text-muted md:grid-cols-4">
            <p>1. Input amount</p>
            <p className={data?.step === 'encrypting' ? 'text-teal' : ''}>2. Encrypt position</p>
            <p className={data?.step === 'awaiting_wallet' ? 'text-warning' : ''}>3. Wallet confirm</p>
            <p className={data?.step === 'success' ? 'text-success' : ''}>4. Private receipt</p>
          </div>
        </div>

        {data?.step === 'encrypting' ? (
          <div className="rounded-2xl border border-line bg-panel/72 p-4">
            <p className="text-sm text-text">Encrypting your position...</p>
            <div className="mt-3 h-12 overflow-hidden rounded-xl border border-line bg-surface before:block before:h-full before:w-1/2 before:animate-shimmer before:bg-white/10 before:content-['']" />
          </div>
        ) : null}

        {data?.step === 'awaiting_wallet' ? (
          <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4 text-sm text-warning">
            Confirm the transaction in your wallet to submit the encrypted payload.
          </div>
        ) : null}

        {data?.step === 'success' ? (
          <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm text-success">
            <p>Bet placed privately.</p>
            <p className="mt-2 font-mono text-xs text-text">
              tx {truncateAddress(data.txHash ?? marketAddress)}
            </p>
          </div>
        ) : null}

        {isError && error ? <p className="text-sm text-danger">{error.message}</p> : null}

        <div className="flex justify-between">
          <Button onClick={handleClose} type="button" variant="ghost">
            Cancel
          </Button>
          <Button
            disabled={isLoading}
            onClick={() =>
              placeBet({
                amount,
                marketAddress,
                outcomeId: outcome.id,
              })
            }
            type="button"
          >
            {isLoading ? 'Processing...' : 'Place Bet'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

