'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Activity, ShieldCheck, Ticket, Trophy } from 'lucide-react';
import CofheBetProvider from '@/components/betting/CofheBetProvider';
import PortfolioSummaryBar from '@/components/portfolio/PortfolioSummaryBar';
import AllocationChart from '@/components/portfolio/AllocationChart';
import PositionRow from '@/components/portfolio/PositionRow';
import RedeemableSection from '@/components/portfolio/RedeemableSection';
import RevealFlow from '@/components/portfolio/RevealFlow';
import ContentSkeleton from '@/components/ui/ContentSkeleton';
import useMarkets from '@/hooks/useMarkets';
import usePrivatePortfolio from '@/hooks/usePrivatePortfolio';
import usePortfolioAnalytics from '@/hooks/usePortfolioAnalytics';
import useAppStore from '@/store/useAppStore';
import { formatTokenAmount } from '@/lib/formatters';
import { getOutcomeColor } from '@/lib/outcomeColors';
import type { PrivacyState } from '@/components/ui/PrivacyBadge';

const heroSwatches = [0, 1, 2, 3].map((index) => getOutcomeColor(index));

function PortfolioDesk(): JSX.Element {
  const { data: markets, isLoading: marketsLoading } = useMarkets();
  const isPortfolioVisible = useAppStore((state) => state.isPortfolioVisible);
  const togglePortfolioVisible = useAppStore((state) => state.togglePortfolioVisible);
  const privatePortfolio = usePrivatePortfolio(markets, isPortfolioVisible);

  const analytics = usePortfolioAnalytics(
    privatePortfolio.data,
    markets,
    isPortfolioVisible && !privatePortfolio.isLoading,
  );

  const privacyState: PrivacyState = !isPortfolioVisible
    ? 'sealed'
    : privatePortfolio.isLoading
      ? 'partial'
      : 'revealed';

  // Build enriched position list
  const openPositions = useMemo(() => {
    return privatePortfolio.data
      .filter((position) => position.shares > 0n)
      .map((position) => {
        const market = markets.find((m) => m.marketId === position.marketId);
        const outcome = market?.outcomes.find((o) => o.outcomeIndex === position.outcomeIndex);
        if (!market || !outcome) return null;
        return { market, outcome, shares: position.shares };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (a.market.marketId !== b.market.marketId)
          return a.market.marketId - b.market.marketId;
        return a.outcome.outcomeIndex - b.outcome.outcomeIndex;
      });
  }, [privatePortfolio.data, markets]);

  // Group by market for the position table
  const groupedByMarket = useMemo(() => {
    const groups: Record<number, typeof openPositions> = {};
    for (const pos of openPositions) {
      if (!groups[pos.market.marketId]) {
        groups[pos.market.marketId] = [];
      }
      groups[pos.market.marketId].push(pos);
    }
    return Object.values(groups);
  }, [openPositions]);

  const isRevealed = isPortfolioVisible && !privatePortfolio.isLoading;

  const settledHistory = useMemo(() => {
    return markets
      .filter((market) => market.status === 'FINALIZED' && market.finalOutcomeIndex !== null)
      .map((market) => {
        const marketPositions = privatePortfolio.data.filter((position) => position.marketId === market.marketId);
        const winningShares = marketPositions
          .filter((position) => position.outcomeIndex === market.finalOutcomeIndex)
          .reduce((sum, position) => sum + position.shares, 0n);
        const nonWinningShares = marketPositions
          .filter((position) => position.outcomeIndex !== market.finalOutcomeIndex)
          .reduce((sum, position) => sum + position.shares, 0n);
        const investedAmount = marketPositions.reduce((sum, position) => sum + position.investedAmount, 0n);
        const realization = privatePortfolio.realized.find((item) => item.marketId === market.marketId);
        const redeemedPayout = realization?.redeemedPayout ?? 0n;
        const realizedInvestmentBasis = realization?.realizedInvestmentBasis ?? 0n;

        if (
          winningShares === 0n &&
          nonWinningShares === 0n &&
          investedAmount === 0n &&
          redeemedPayout === 0n &&
          realizedInvestmentBasis === 0n
        ) {
          return null;
        }

        const winningOutcome = market.outcomes.find((outcome) => outcome.outcomeIndex === market.finalOutcomeIndex);
        return {
          market,
          winningOutcomeLabel: winningOutcome?.label ?? 'Final outcome',
          winningShares,
          nonWinningShares,
          investedAmount,
          redeemedPayout,
          realizedInvestmentBasis,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [markets, privatePortfolio.data, privatePortfolio.realized]);

  return (
    <div className="pt-8 pb-16 mt-20">
      {/* Header */}
      <header className="mb-8">
        {/* <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
            Private Portfolio
        </div> */}
        <h1 className="text-[32px] lg:text-[40px] leading-[1.1] tracking-[-0.04em]">
          <span className="font-serif italic text-[#e8e4df]">My</span>
          <span className="font-sans font-light text-white/35 ml-2">positions.</span>
        </h1>
      </header>

      <main className="space-y-8">
        {/* Reveal Flow */}
        <RevealFlow
          isRevealed={isPortfolioVisible}
          isLoading={isPortfolioVisible && privatePortfolio.isLoading}
          isError={privatePortfolio.isError}
          errorMessage={privatePortfolio.error?.message}
          onToggle={togglePortfolioVisible}
        />

        {/* Summary Bar */}
        <PortfolioSummaryBar
          totalPositions={analytics.totalPositions}
          estimatedValue={
            isRevealed
              ? `${analytics.estimatedValueFormatted} ${markets[0]?.collateralSymbol ?? ''}`
              : null
          }
          marketsParticipated={analytics.marketsParticipated || markets.length}
          redeemableCount={analytics.redeemableCount}
          privacyState={privacyState}
          isLoading={isPortfolioVisible && privatePortfolio.isLoading}
        />

        {/* Allocation Chart */}
        <AllocationChart
          items={analytics.allocationItems}
          isRevealed={isRevealed}
        />

        {/* Redeemable Section */}
        <RedeemableSection
          markets={markets}
          positions={privatePortfolio.data}
          isRevealed={isRevealed}
          isLoading={privatePortfolio.isLoading}
        />



        {/* Positions Table */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 hover:scale-105"
              style={{
                backgroundColor: heroSwatches[0].softBackground,
                borderColor: heroSwatches[0].border,
                color: heroSwatches[0].text,
                boxShadow: `0 0 24px ${heroSwatches[0].shadow}`,
              }}
            >
              <Ticket className="h-5 w-5" />
            </div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
              Open Positions
            </h2>
          </div>

          {!isPortfolioVisible ? (
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              <p className="text-sm text-white/25 font-light">
                Reveal your portfolio to see your encrypted positions.
              </p>
            </div>
          ) : privatePortfolio.isLoading ? (
            <div className="space-y-2">
              <ContentSkeleton variant="position-row" />
              <ContentSkeleton variant="position-row" />
              <ContentSkeleton variant="position-row" />
            </div>
          ) : openPositions.length === 0 ? (
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-10 text-center shadow-[0_24px_70px_rgba(0,0,0,0.34)] space-y-3">
              <p className="text-sm text-white/30 font-light">
                No positions found for this wallet.
              </p>
              <Link
                href="/dashboard"
                className="inline-flex text-xs text-primary hover:text-primary/80 transition-colors"
              >
                Explore markets →
              </Link>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[2.5fr,1fr,1fr,0.8fr,0.8fr,auto] gap-4 px-6 lg:px-8 py-3 border-b border-white/5 bg-white/[0.02]">
                {['Market', 'Outcome', 'Shares', 'Est. Value', 'Status', 'Action'].map((col) => (
                  <p key={col} className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/25">
                    {col}
                  </p>
                ))}
              </div>

              {/* Rows */}
              <div>
                {groupedByMarket.flatMap((group) =>
                  group.map((pos, idx) => (
                    <PositionRow
                      key={`${pos.market.marketId}-${pos.outcome.id}`}
                      marketId={pos.market.marketId}
                      marketTitle={pos.market.title}
                      category={pos.market.category}
                      outcomeLabel={pos.outcome.label}
                      outcomeIndex={pos.outcome.outcomeIndex}
                      shares={pos.shares}
                      currentProbability={pos.outcome.impliedShare}
                      marketStatus={pos.market.status}
                      collateralDecimals={pos.market.collateralSymbol === 'USDC' ? 6 : 18}
                      collateralSymbol={pos.market.collateralSymbol}
                      isRevealed={isRevealed}
                      isGroupHead={idx === 0}
                      index={idx}
                    />
                  )),
                )}
              </div>
            </div>
          )}
        </section>

        {isRevealed && settledHistory.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 hover:scale-105"
                style={{
                  backgroundColor: heroSwatches[3].softBackground,
                  borderColor: heroSwatches[3].border,
                  color: heroSwatches[3].text,
                  boxShadow: `0 0 24px ${heroSwatches[3].shadow}`,
                }}
              >
                <Trophy className="h-5 w-5" />
              </div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
                Settled History
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {settledHistory.map((item) => {
                const decimals = item.market.collateralSymbol === 'USDC' ? 6 : 18;
                const totalPayout = item.winningShares + item.redeemedPayout;
                const totalBasis = item.investedAmount + item.realizedInvestmentBasis;
                const isNetPositive = totalPayout >= totalBasis;
                const netValue = isNetPositive ? totalPayout - totalBasis : totalBasis - totalPayout;
                const netLabel = `${isNetPositive ? '+' : '-'}${formatTokenAmount(
                  netValue,
                  decimals,
                  item.market.collateralSymbol,
                )}`;

                return (
                  <div
                    key={item.market.marketId}
                    className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.025] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.34)]"
                  >
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                      Resolved to {item.winningOutcomeLabel}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[#e8e4df]">
                      {item.market.title}
                    </h3>
                    <div className="mt-4 grid gap-3 text-xs text-white/40 sm:grid-cols-2">
                      <p>
                        Claimable shares:{' '}
                        <span className="text-white/70">
                          {formatTokenAmount(item.winningShares, decimals, item.market.collateralSymbol)}
                        </span>
                      </p>
                      <p>
                        Redeemed payout:{' '}
                        <span className="text-white/70">
                          {formatTokenAmount(item.redeemedPayout, decimals, item.market.collateralSymbol)}
                        </span>
                      </p>
                      <p>
                        Non-winning shares:{' '}
                        <span className="text-white/70">
                          {formatTokenAmount(item.nonWinningShares, decimals, 'shares')}
                        </span>
                      </p>
                      <p>
                        Remaining invested:{' '}
                        <span className="text-white/70">
                          {formatTokenAmount(item.investedAmount, decimals, item.market.collateralSymbol)}
                        </span>
                      </p>
                      <p>
                        Net after cost:{' '}
                        <span className={isNetPositive ? 'text-emerald-200' : 'text-rose-200'}>
                          {netLabel}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Security Details */}
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8533a]/10 flex items-center justify-center border border-[#e8533a]/20">
              <ShieldCheck className="h-5 w-5 text-[#e8533a]" />
            </div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
              Security Details
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Activity,
                text: 'Market prices, reserves, and probabilities remain public to keep quotes honest.',
              },
              {
                icon: Ticket,
                text: 'Your cumulative per-outcome balance is encrypted on-chain. Nobody can see your stake.',
              },
              {
                icon: Trophy,
                text: 'Winning shares can be redeemed after finalization through the market detail page.',
              },
            ].map((item, i) => (
              <div key={i} className="glass-card interactive-glow rounded-[24px] p-6 flex flex-col gap-4">
                <item.icon className="h-5 w-5 text-[#e8533a]" />
                <p className="text-[13px] leading-relaxed text-white/40 font-light">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function MyBetsPage(): JSX.Element {
  return (
    <CofheBetProvider>
      <PortfolioDesk />
    </CofheBetProvider>
  );
}
