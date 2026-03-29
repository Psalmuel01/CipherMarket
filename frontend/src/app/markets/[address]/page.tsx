'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Info,
  ShieldCheck,
  ArrowLeft,
  Trophy,
  Clock,
  History,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import TopBar from '@/components/layout/TopBar';
import BetModal from '@/components/betting/BetModal';
import OutcomeSelector from '@/components/betting/OutcomeSelector';
import PoolDisplay from '@/components/betting/PoolDisplay';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useClaimReward from '@/hooks/useClaimReward';
import useMarketDetails from '@/hooks/useMarketDetails';
import { formatDateTime, formatRelativeExpiry, formatTokenAmount } from '@/lib/formatters';

export default function Page({
  params,
}: {
  params: { address: string };
}): JSX.Element {
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('0');
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const { data, error, isError, isLoading } = useMarketDetails(params.address);
  const {
    claimReward,
    data: claimReceipt,
    error: claimError,
    isError: isClaimError,
    isLoading: isClaimLoading,
  } = useClaimReward();

  const selectedOutcome = useMemo(() => {
    if (!data) {
      return null;
    }

    return data.outcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? data.outcomes[0] ?? null;
  }, [data, selectedOutcomeId]);

  const finalOutcome =
    data?.finalOutcomeIndex !== null && data?.finalOutcomeIndex !== undefined
      ? data.outcomes.find((outcome) => outcome.outcomeIndex === data.finalOutcomeIndex) ?? null
      : null;

  const handleClaim = async (): Promise<void> => {
    if (!data) {
      return;
    }

    await claimReward(
      data.marketId,
      data.claimableAmount,
      data.collateralSymbol,
      data.collateralSymbol === 'USDC' ? 6 : 18,
    );
  };

  return (
    <>
      <TopBar eyebrow="Market Protocol" title="Terminal Access" />
      <main className="space-y-10 px-4 py-8 lg:px-10">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-16 w-full max-w-4xl rounded-3xl" />
            <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
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
                className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Markets
              </Link>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    FHE Powered Privacy
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    STATUS: {data.status}
                  </span>
                </div>
                <h2 className="text-4xl font-black tracking-tight text-foreground md:text-5xl">
                  {data.title}
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
                  <Clock className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Expires</p>
                    <p>{formatRelativeExpiry(data.expiryTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Resolution</p>
                    <p>{finalOutcome ? `${finalOutcome.label} (Final)` : 'Optimistic Oracle'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-sm font-bold">
                  <History className="h-5 w-5 text-primary" />
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Collateral</p>
                    <p>{data.collateralSymbol}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
              <div className="space-y-8">
                <PoolDisplay pools={data.pools} />

                <div className="glass-card rounded-3xl p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Market Information</h3>
                  </div>

                  <div className="grid gap-4 text-sm text-muted-foreground md:grid-cols-2">
                    <p>
                      This market uses Fully Homomorphic Encryption (FHE) to mirror individual stakes
                      privately while exposing only aggregate pool health.
                    </p>
                    <div className="space-y-2">
                      <p>Category: {data.category}</p>
                      <p>Type: {data.type}</p>
                      <p>Minimum stake: {formatTokenAmount(data.minimumStake, data.collateralSymbol === 'USDC' ? 6 : 18, data.collateralSymbol)}</p>
                      <p>Created: {formatDateTime(data.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="space-y-6">
                <div className="glass-card rounded-3xl p-8 space-y-8">
                  {data.status !== 'FINALIZED' ? (
                    <>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Activity className="h-5 w-5 text-primary" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-foreground">
                              Place a Bet
                            </h3>
                          </div>
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                            MARKET #{data.marketId}
                          </span>
                        </div>

                        <OutcomeSelector
                          onSelect={setSelectedOutcomeId}
                          outcomes={data.outcomes}
                          selectedOutcomeId={selectedOutcome?.id ?? '0'}
                        />
                      </div>

                      <div className="space-y-3 rounded-2xl bg-white/[0.03] p-4 text-xs font-bold leading-relaxed text-muted-foreground">
                        <div className="flex items-start gap-3">
                          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
                          <p>Encrypted by FHE. Only the final settlement is shared publicly.</p>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full"
                        disabled={data.status !== 'ACTIVE' || !selectedOutcome}
                        onClick={() => setModalOpen(true)}
                        type="button"
                      >
                        Place Private Bet
                      </Button>
                    </>
                  ) : (
                    <div className="space-y-8 text-center py-4">
                      <div className="flex justify-center">
                        <div className="rounded-full bg-primary/20 p-4 text-primary">
                          <Trophy className="h-8 w-8" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-xl font-black tracking-tight text-foreground">
                          Market Finalized
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Winning outcome: {finalOutcome?.label ?? 'Unavailable'}.
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.03] p-6 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Claimable Payout
                        </p>
                        <p className="text-3xl font-black text-primary">
                          {formatTokenAmount(
                            data.claimableAmount,
                            data.collateralSymbol === 'USDC' ? 6 : 18,
                            data.collateralSymbol,
                          )}
                        </p>
                      </div>

                      <Button
                        size="lg"
                        disabled={isClaimLoading || data.claimableAmount === 0n}
                        onClick={handleClaim}
                        type="button"
                        className="w-full gap-2"
                      >
                        {claimReceipt ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {claimReceipt ? 'Reward Claimed' : isClaimLoading ? 'Claiming...' : 'Claim Wins'}
                      </Button>

                      {claimReceipt ? (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] font-bold text-muted-foreground text-center"
                        >
                          Transaction finalized: {claimReceipt.txHash.slice(0, 10)}...
                        </motion.p>
                      ) : null}

                      {isClaimError && claimError ? (
                        <p className="text-xs font-bold text-destructive">{claimError.message}</p>
                      ) : null}
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {selectedOutcome ? (
              <BetModal
                marketId={data.marketId}
                marketTitle={data.title}
                collateralDecimals={data.collateralSymbol === 'USDC' ? 6 : 18}
                collateralSymbol={data.collateralSymbol}
                collateralToken={data.collateralToken}
                onClose={() => setModalOpen(false)}
                open={isModalOpen}
                outcome={selectedOutcome}
              />
            ) : null}
          </>
        ) : null}
      </main>
    </>
  );
}
