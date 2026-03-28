'use client';

import { useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import BetModal from '@/components/betting/BetModal';
import OutcomeSelector from '@/components/betting/OutcomeSelector';
import PoolDisplay from '@/components/betting/PoolDisplay';
import Button from '@/components/ui/Button';
import useClaimReward from '@/hooks/useClaimReward';
import type { MarketOutcome, PoolSnapshot } from '@/types/market';

const OUTCOMES: MarketOutcome[] = [
  { id: 'yes', label: 'YES', impliedShare: 58 },
  { id: 'no', label: 'NO', impliedShare: 42 },
];

const POOLS: PoolSnapshot[] = [
  { outcomeId: 'yes', label: 'YES', liquidity: 738000n, percentage: 58 },
  { outcomeId: 'no', label: 'NO', liquidity: 542000n, percentage: 42 },
];

export default function Page({
  params,
}: {
  params: { address: `0x${string}` };
}): JSX.Element {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('yes');
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const { claimReward, data, isLoading } = useClaimReward();
  const selectedOutcome = OUTCOMES.find((outcome) => outcome.id === selectedOutcomeId) ?? OUTCOMES[0];

  return (
    <>
      <TopBar eyebrow="Detail" title="Market Detail" />
      <main className="space-y-8 px-4 py-8 lg:px-10">
        <div className="max-w-4xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal">{params.address}</p>
          <h2 className="text-3xl font-medium text-text">
            Will ETH settle above $4,000 by June 30?
          </h2>
          <p className="max-w-3xl text-sm leading-6 text-muted">
            Individual stakes remain encrypted. The market exposes only aggregate pool sizing and
            the lifecycle state required for trading and settlement.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
          <PoolDisplay pools={POOLS} />

          <section className="space-y-4 rounded-2xl border border-line bg-panel/72 p-5">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                Select Outcome
              </p>
              <OutcomeSelector
                onSelect={setSelectedOutcomeId}
                outcomes={OUTCOMES}
                selectedOutcomeId={selectedOutcomeId}
              />
            </div>

            <div className="rounded-2xl border border-line bg-surface/70 p-4 text-sm text-muted">
              <p>Selected side: {selectedOutcome.label}</p>
              <p className="mt-2">
                Privacy note: only the final encrypted transaction handle is shared publicly.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setModalOpen(true)} type="button">
                Place Private Bet
              </Button>
              <Button disabled={isLoading} onClick={() => claimReward()} type="button" variant="ghost">
                {isLoading ? 'Generating Permit...' : 'Claim Reward'}
              </Button>
            </div>

            {data ? (
              <div className="rounded-2xl border border-success/20 bg-success/10 p-4 text-sm text-success">
                Claim prepared: {data.amount} · {data.txHash}
              </div>
            ) : null}
          </section>
        </div>

        <BetModal
          marketAddress={params.address}
          onClose={() => setModalOpen(false)}
          open={isModalOpen}
          outcome={selectedOutcome}
        />
      </main>
    </>
  );
}

