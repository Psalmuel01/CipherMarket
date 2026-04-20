'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Gavel,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Trophy,
} from 'lucide-react';
import CofheBetProvider from '@/components/betting/CofheBetProvider';
import OutcomeSelector from '@/components/betting/OutcomeSelector';
import PoolDisplay from '@/components/betting/PoolDisplay';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useDisputeOutcome from '@/hooks/useDisputeOutcome';
import useFinalizeMarket from '@/hooks/useFinalizeMarket';
import useMarketDetails from '@/hooks/useMarketDetails';
import usePrivatePositions from '@/hooks/usePrivatePositions';
import useProposeOutcome from '@/hooks/useProposeOutcome';
import useRedeemShares from '@/hooks/useRedeemShares';
import {
  formatDateTime,
  formatTokenAmount,
  truncateAddress,
} from '@/lib/formatters';

const BetModal = dynamic(() => import('@/components/betting/BetModal'), {
  ssr: false,
});

function MarketDetailDesk({ marketIdParam }: { marketIdParam: string }): JSX.Element {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('0');
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [isPortfolioVisible, setPortfolioVisible] = useState<boolean>(false);
  const [disputeAmount, setDisputeAmount] = useState<string>('0.01');
  const { data, error, isError, isLoading } = useMarketDetails(marketIdParam);
  const privatePositions = usePrivatePositions(
    data?.marketId ?? 0,
    data?.outcomeCount ?? 0,
    Boolean(data) && isPortfolioVisible,
  );
  const proposeOutcomeMutation = useProposeOutcome();
  const disputeOutcomeMutation = useDisputeOutcome();
  const finalizeMarketMutation = useFinalizeMarket();
  const redeemMutation = useRedeemShares();

  const collateralDecimals = data?.collateralSymbol === 'USDC' ? 6 : 18;

  const enrichedOutcomes = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.outcomes.map((outcome, index) => ({
      ...outcome,
      revealedShares: isPortfolioVisible ? (privatePositions.data[index] ?? 0n) : null,
    }));
  }, [data, isPortfolioVisible, privatePositions.data]);

  const selectedOutcome =
    enrichedOutcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? enrichedOutcomes[0] ?? null;
  const finalOutcome =
    data?.finalOutcomeIndex !== null && data?.finalOutcomeIndex !== undefined
      ? enrichedOutcomes.find((outcome) => outcome.outcomeIndex === data.finalOutcomeIndex) ?? null
      : null;
  const revealedWinningShares =
    finalOutcome && isPortfolioVisible ? (finalOutcome.revealedShares ?? 0n) : 0n;
  const sellDisabled = tradeSide === 'SELL' && (!isPortfolioVisible || (selectedOutcome?.revealedShares ?? 0n) === 0n);

  const handleRedeem = async (): Promise<void> => {
    if (!data) {
      return;
    }

    await redeemMutation.redeemShares(
      data.marketId,
      revealedWinningShares,
      data.collateralSymbol,
      collateralDecimals,
    );
  };

  const lifecyclePanel = (() => {
    if (!data) {
      return null;
    }

    if (data.status === 'ACTIVE') {
      return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-muted-foreground">
          Trading is open. Pool reserves, probabilities, and price impact stay public so the market
          is legible. Your cumulative position remains hidden unless you reveal it locally.
        </div>
      );
    }

    if (data.status === 'EXPIRED') {
      return (
        <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Trading has closed</p>
              <p className="text-sm text-muted-foreground">
                This market is waiting for an eligible oracle to propose a resolution.
              </p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Oracle source</p>
            <p className="break-all text-foreground">{data.oracleSource}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              onClick={() =>
                proposeOutcomeMutation.proposeOutcome(
                  data.marketId,
                  Number.parseInt(selectedOutcomeId, 10),
                )
              }
              disabled={proposeOutcomeMutation.isLoading || !selectedOutcome}
              type="button"
            >
              <ShieldCheck className="h-4 w-4" />
              {proposeOutcomeMutation.isLoading ? 'Submitting...' : 'Propose Selected Outcome'}
            </Button>
            <Link href="/oracle">
              <Button variant="outline" type="button">
                Become an Oracle
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (data.status === 'PROPOSED') {
      return (
        <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <TimerReset className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Proposal live</p>
              <p className="text-sm text-muted-foreground">
                Proposed outcome: {enrichedOutcomes[data.proposedOutcomeIndex ?? 0]?.label ?? 'Unknown'}.
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
            <p>Proposed by {data.proposedBy ? truncateAddress(data.proposedBy) : 'Unknown'}</p>
            <p>
              Dispute deadline{' '}
              {data.disputeWindowEndsAt ? formatDateTime(data.disputeWindowEndsAt) : 'Unavailable'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              className="h-11 rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-foreground outline-none focus:border-primary/50"
              onChange={(event) => setDisputeAmount(event.target.value)}
              value={disputeAmount}
            />
            <Button
              variant="outline"
              className="gap-2"
              onClick={() =>
                disputeOutcomeMutation.disputeOutcome(
                  data.marketId,
                  disputeAmount,
                  collateralDecimals,
                  data.collateralToken === '0x0000000000000000000000000000000000000000',
                )
              }
              disabled={disputeOutcomeMutation.isLoading}
              type="button"
            >
              <AlertTriangle className="h-4 w-4" />
              {disputeOutcomeMutation.isLoading ? 'Staking...' : 'Open Dispute'}
            </Button>
            <Button
              className="gap-2"
              onClick={() => finalizeMarketMutation.finalizeMarket(data.marketId)}
              disabled={finalizeMarketMutation.isLoading}
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {finalizeMarketMutation.isLoading ? 'Finalizing...' : 'Finalize if Undisputed'}
            </Button>
          </div>
        </div>
      );
    }

    if (data.status === 'DISPUTED') {
      return (
        <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <Gavel className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Dispute pending</p>
              <p className="text-sm text-muted-foreground">
                Resolution is now under review. Trading is closed until the final outcome is set.
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <p>Dispute stake locked: {formatTokenAmount(data.disputeStakeTotal, collateralDecimals, data.collateralSymbol)}</p>
            <p>Oracle source: {data.oracleSource}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/8 p-5">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Market finalized</p>
            <p className="text-sm text-muted-foreground">
              Winning outcome: {finalOutcome?.label ?? 'Unavailable'}.
            </p>
          </div>
        </div>
        <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
          <p>
            Remaining winning shares:{' '}
            {formatTokenAmount(data.remainingWinningShares, collateralDecimals, 'shares')}
          </p>
          <p>
            Protocol fees reserved:{' '}
            {formatTokenAmount(data.accruedProtocolFees, collateralDecimals, data.collateralSymbol)}
          </p>
        </div>
      </div>
    );
  })();

  return (
    <main className="space-y-10 px-4 py-8 lg:px-10">
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-24 w-full max-w-5xl rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      ) : null}

      {isError && error ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="max-w-5xl space-y-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to markets
            </Link>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  Economic v1 privacy
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {data.status}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Market #{data.marketId}
                </span>
              </div>
              <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                {data.title}
              </h2>
              <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                {data.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Closes
                </p>
                <p className="mt-2 text-sm text-foreground">{formatDateTime(data.expiryTime)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Collateral
                </p>
                <p className="mt-2 text-sm text-foreground">{data.collateralSymbol}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Seeded Liquidity
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {formatTokenAmount(data.seedLiquidity, collateralDecimals, data.collateralSymbol)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Oracle Source
                </p>
                <p className="mt-2 truncate text-sm text-foreground">{data.oracleSource}</p>
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
            <div className="space-y-8">
              <PoolDisplay pools={data.pools} />

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Outcome Board
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Pool prices are public
                  </span>
                </div>
                <OutcomeSelector
                  onSelect={setSelectedOutcomeId}
                  outcomes={enrichedOutcomes}
                  selectedOutcomeId={selectedOutcome?.id ?? '0'}
                />
              </div>

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Private Position
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPortfolioVisible((current) => !current)}
                    type="button"
                  >
                    {isPortfolioVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isPortfolioVisible ? 'Hide values' : 'Reveal values'}
                  </Button>
                </div>

                {privatePositions.isError && privatePositions.error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    {privatePositions.error.message}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  {enrichedOutcomes.map((outcome) => (
                    <div
                      key={outcome.id}
                      className="rounded-2xl border border-white/5 bg-white/[0.03] p-4"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {outcome.label}
                      </p>
                      <p className="mt-2 font-mono text-2xl text-foreground">
                        {!isPortfolioVisible
                          ? '••••'
                          : privatePositions.isLoading
                            ? 'Decrypting...'
                            : formatTokenAmount(
                              outcome.revealedShares ?? 0n,
                              collateralDecimals,
                              'shares',
                            )}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {!isPortfolioVisible
                          ? 'Hidden until you reveal locally.'
                          : 'Local decrypt only. Nothing public is added to the chain.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card space-y-3 rounded-3xl p-8">
                <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                  Market Mechanics
                </h3>
                <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                  <p>
                    CipherMarket uses a seeded fixed-product market maker. Pool reserves, prices,
                    and probabilities remain public so quoting and settlement stay standard.
                  </p>
                  <p>
                    What stays private in v1 is your cumulative position. Other users cannot read
                    whether you hold shares, how many you hold, or which outcome you accumulated
                    from contract storage.
                  </p>
                </div>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                    Lifecycle
                  </h3>
                  <Link href="/docs" className="text-xs text-primary hover:underline">
                    Read docs
                  </Link>
                </div>
                {lifecyclePanel}

                {proposeOutcomeMutation.isError && proposeOutcomeMutation.error ? (
                  <p className="text-xs text-destructive">{proposeOutcomeMutation.error.message}</p>
                ) : null}
                {disputeOutcomeMutation.isError && disputeOutcomeMutation.error ? (
                  <p className="text-xs text-destructive">{disputeOutcomeMutation.error.message}</p>
                ) : null}
                {finalizeMarketMutation.isError && finalizeMarketMutation.error ? (
                  <p className="text-xs text-destructive">{finalizeMarketMutation.error.message}</p>
                ) : null}
              </div>

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Trade Panel
                    </h3>
                  </div>
                  <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                    <button
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${tradeSide === 'BUY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      onClick={() => setTradeSide('BUY')}
                      type="button"
                    >
                      Buy
                    </button>
                    <button
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${tradeSide === 'SELL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      onClick={() => setTradeSide('SELL')}
                      type="button"
                    >
                      Sell
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm text-muted-foreground">
                  {tradeSide === 'BUY'
                    ? 'Estimate the quote, confirm in wallet, and the pool updates immediately while your resulting position stays private.'
                    : 'Selling requires a verified private balance. Reveal locally first, then CipherMarket verifies that balance before execution.'}
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={data.status !== 'ACTIVE' || !selectedOutcome || sellDisabled}
                  onClick={() => setModalOpen(true)}
                  type="button"
                >
                  {tradeSide === 'BUY'
                    ? 'Buy Shares'
                    : sellDisabled
                      ? 'Reveal Position to Sell'
                      : 'Sell Shares'}
                </Button>
              </div>

              {data.status === 'FINALIZED' ? (
                <div className="glass-card space-y-5 rounded-3xl p-8">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Redemption
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Redeemable winning shares
                    </p>
                    <p className="mt-2 font-mono text-2xl text-foreground">
                      {!isPortfolioVisible
                        ? '••••'
                        : privatePositions.isLoading
                          ? 'Decrypting...'
                          : formatTokenAmount(revealedWinningShares, collateralDecimals, data.collateralSymbol)}
                    </p>
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={!isPortfolioVisible || revealedWinningShares === 0n || redeemMutation.isLoading}
                    onClick={() => void handleRedeem()}
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {redeemMutation.isLoading ? 'Processing claim...' : 'Redeem Winning Shares'}
                  </Button>

                  {redeemMutation.isError && redeemMutation.error ? (
                    <p className="text-xs text-destructive">{redeemMutation.error.message}</p>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>

          {selectedOutcome ? (
            <BetModal
              marketId={data.marketId}
              marketTitle={data.title}
              collateralDecimals={collateralDecimals}
              collateralSymbol={data.collateralSymbol}
              collateralToken={data.collateralToken}
              onClose={() => setModalOpen(false)}
              open={isModalOpen}
              outcome={selectedOutcome}
              side={tradeSide}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export default function Page({
  params,
}: {
  params: { address: string };
}): JSX.Element {
  return (
    <CofheBetProvider>
      <MarketDetailDesk marketIdParam={params.address} />
    </CofheBetProvider>
  );
}
