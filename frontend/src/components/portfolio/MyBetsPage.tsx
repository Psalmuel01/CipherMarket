'use client';

import Link from 'next/link';
import { Activity, Eye, EyeOff, Loader2, ShieldCheck, Ticket, Trophy } from 'lucide-react';
import CofheBetProvider from '@/components/betting/CofheBetProvider';
import Button from '@/components/ui/Button';
import useMarkets from '@/hooks/useMarkets';
import usePrivatePortfolio from '@/hooks/usePrivatePortfolio';
import useAppStore from '@/store/useAppStore';
import { formatTokenAmount } from '@/lib/formatters';

function PortfolioDesk(): JSX.Element {
  const { data: markets, error, isError, isLoading } = useMarkets();
  const isPortfolioVisible = useAppStore((state) => state.isPortfolioVisible);
  const togglePortfolioVisible = useAppStore((state) => state.togglePortfolioVisible);
  const privatePortfolio = usePrivatePortfolio(markets, isPortfolioVisible);

  const openPositions = privatePortfolio.data
    .map((position) => {
      const market = markets.find((candidate) => candidate.marketId === position.marketId);
      const outcome = market?.outcomes.find((candidate) => candidate.outcomeIndex === position.outcomeIndex);

      if (!market || !outcome) {
        return null;
      }

      return {
        market,
        outcome,
        shares: position.shares,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    // Sort by market ID, then outcome index for consistent ordering
    .sort((a, b) => {
      if (a.market.marketId !== b.market.marketId) {
        return a.market.marketId - b.market.marketId;
      }
      return a.outcome.outcomeIndex - b.outcome.outcomeIndex;
    });

  // Group positions by market for a cleaner table
  const groupedByMarket = openPositions.reduce<
    Record<number, { market: typeof openPositions[0]['market']; entries: typeof openPositions }>
  >((acc, pos) => {
    if (!acc[pos.market.marketId]) {
      acc[pos.market.marketId] = { market: pos.market, entries: [] };
    }
    acc[pos.market.marketId].entries.push(pos);
    return acc;
  }, {});

  const sortedMarketGroups = Object.values(groupedByMarket).sort(
    (a, b) => a.market.marketId - b.market.marketId,
  );

  return (
    <div className="pt-8 pb-12">
      <header className="mb-1 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
            Private Portfolio
          </div>
          <h1 className="text-[32px] lg:text-[40px] leading-[1.1] tracking-[-0.04em]">
            <span className="font-serif italic text-[#e8e4df]">My</span>
            <span className="font-sans font-light text-white/35 ml-2">positions.</span>
          </h1>
        </div>

        <Button variant="outline" size="sm" className="gap-2 self-start md:self-end" onClick={togglePortfolioVisible}>
          {isPortfolioVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {isPortfolioVisible ? 'Hide values' : 'Reveal values'}
        </Button>
      </header>

      <main className="space-y-12">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-white/40">
              Pool state stays visible. Your cumulative holdings remain hidden until you reveal
              them locally.
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: 'Markets tracked', value: markets.length },
            { label: 'Private positions', value: !isPortfolioVisible ? '••' : privatePortfolio.isLoading ? '...' : openPositions.length },
            { label: 'Finalized markets', value: markets.filter((market) => market.status === 'FINALIZED').length }
          ].map((stat) => (
            <div key={stat.label} className="glass-card interactive-glow rounded-[32px] p-8">
              <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
                {stat.label}
              </p>
              <p className="mt-4 font-mono text-3xl text-[#e8e4df]">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* ... error/loading blocks ... */}

        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8533a]/10 flex items-center justify-center border border-[#e8533a]/20">
              <Ticket className="h-5 w-5 text-[#e8533a]" />
            </div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
              Open Positions
            </h2>
          </div>

          {!isPortfolioVisible ? (
            <div className="glass-card rounded-[32px] p-12 text-center">
              <p className="text-sm text-white/30 font-light">
                Reveal locally to decrypt your current holdings. <br />Nothing public is added to the chain.
              </p>
            </div>
          ) : privatePortfolio.isLoading ? (
            /* Loading state while decrypting positions */
            <div className="glass-card rounded-[32px] p-12 flex flex-col items-center justify-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-[#e8533a]/20 border-t-[#e8533a] animate-spin" />
                <Loader2 className="absolute inset-0 m-auto h-5 w-5 text-[#e8533a] animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-[#e8e4df] font-medium">Decrypting your positions...</p>
                <p className="text-xs text-white/30 font-light">
                  Creating a self-permit and revealing encrypted balances. This may take a moment.
                </p>
              </div>
            </div>
          ) : openPositions.length === 0 ? (
            <div className="glass-card rounded-[32px] p-12 text-center text-sm text-white/30 font-light">
              No positions found for this wallet. Trade on any active market to get started.
            </div>
          ) : (
            /* Properly structured table view */
            <div className="glass-card rounded-[32px] overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-4 px-8 py-4 border-b border-white/5 bg-white/[0.02]">
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">Market</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">Outcome</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">Shares</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">Status</p>
                <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">Action</p>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-white/5">
                {sortedMarketGroups.map((group) =>
                  group.entries.map(({ market, outcome, shares }, idx) => (
                    <div
                      key={`${market.marketId}-${outcome.id}`}
                      className="grid grid-cols-1 gap-3 px-8 py-5 transition-colors hover:bg-white/[0.02] md:grid-cols-[2fr,1fr,1fr,1fr,auto] md:items-center md:gap-4"
                    >
                      {/* Market */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8533a]">
                            #{market.marketId}
                          </span>
                          {idx === 0 ? (
                            <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">
                              {market.category}
                            </span>
                          ) : null}
                        </div>
                        {idx === 0 ? (
                          <h3 className="text-[15px] font-semibold text-[#e8e4df] leading-snug line-clamp-1">
                            {market.title}
                          </h3>
                        ) : (
                          <p className="text-[13px] text-white/25 italic">same market</p>
                        )}
                      </div>

                      {/* Outcome */}
                      <div>
                        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Outcome</p>
                        <p className="text-sm text-foreground">{outcome.label}</p>
                      </div>

                      {/* Shares */}
                      <div>
                        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Shares</p>
                        <p className="font-mono text-sm text-foreground">
                          {formatTokenAmount(
                            shares,
                            market.collateralSymbol === 'USDC' ? 6 : 18,
                            'shares',
                          )}
                        </p>
                      </div>

                      {/* Status */}
                      <div>
                        <p className="md:hidden font-mono text-[9px] uppercase tracking-[0.22em] text-white/30 mb-1">Status</p>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${
                          market.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : market.status === 'FINALIZED'
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            market.status === 'ACTIVE'
                              ? 'bg-emerald-400'
                              : market.status === 'FINALIZED'
                                ? 'bg-primary'
                                : 'bg-amber-400'
                          }`} />
                          {market.status}
                        </span>
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        <Link href={`/markets/${market.marketId}`}>
                          <Button variant="outline" size="sm">Open</Button>
                        </Link>
                      </div>
                    </div>
                  )),
                )}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8533a]/10 flex items-center justify-center border border-[#e8533a]/20">
              <ShieldCheck className="h-5 w-5 text-[#e8533a]" />
            </div>
            <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#e8e4df]">
              Security Details
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { icon: Activity, text: 'Market prices, reserves, and probabilities remain public to keep quotes honest.' },
              { icon: Ticket, text: 'Your cumulative per-outcome balance is encrypted on-chain. Nobody can see your stake.' },
              { icon: Trophy, text: 'Winning shares can be redeemed after finalization through the market detail page.' }
            ].map((item, i) => (
              <div key={i} className="glass-card interactive-glow rounded-[32px] p-8 flex flex-col gap-6">
                <item.icon className="h-5 w-5 text-[#e8533a]" />
                <p className="text-[14px] leading-relaxed text-white/40 font-light">
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
