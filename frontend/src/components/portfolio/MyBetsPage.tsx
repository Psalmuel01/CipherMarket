'use client';

import Link from 'next/link';
import { Activity, Eye, EyeOff, ShieldCheck, Ticket, Trophy } from 'lucide-react';
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
    .filter((item): item is NonNullable<typeof item> => item !== null);

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
          ) : openPositions.length === 0 ? (
            <div className="glass-card rounded-[32px] p-12 text-center text-sm text-white/30 font-light">
              No revealed positions found for this wallet yet.
            </div>
          ) : (
            <div className="space-y-3">
              {openPositions.map(({ market, outcome, shares }) => (
                <div
                  key={`${market.marketId}-${outcome.id}`}
                  className="glass-card interactive-glow flex flex-col gap-8 rounded-[32px] p-8 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-2">
                    <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8533a]">
                      {market.category}
                    </p>
                    <h3 className="text-[19px] font-semibold text-[#e8e4df] leading-snug">{market.title}</h3>
                    <p className="text-[13px] text-white/35 font-light max-w-sm">{market.description}</p>
                  </div>

                  <div className="grid gap-8 sm:grid-cols-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Outcome
                      </p>
                      <p className="mt-2 text-sm text-foreground">{outcome.label}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Shares
                      </p>
                      <p className="mt-2 font-mono text-sm text-foreground">
                        {formatTokenAmount(
                          shares,
                          market.collateralSymbol === 'USDC' ? 6 : 18,
                          'shares',
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Status
                      </p>
                      <p className="mt-2 text-sm text-foreground">{market.status}</p>
                    </div>
                  </div>

                  <Link href={`/markets/${market.marketId}`}>
                    <Button variant="outline">Open Market</Button>
                  </Link>
                </div>
              ))}
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
