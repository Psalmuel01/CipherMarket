'use client';

import Link from 'next/link';
import { Activity, Eye, EyeOff, ShieldCheck, Ticket, Trophy } from 'lucide-react';
import CofheBetProvider from '@/components/betting/CofheBetProvider';
import TopBar from '@/components/layout/TopBar';
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
    <>
      <TopBar eyebrow="Private Portfolio" title="My Positions" />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:px-10">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Pool state stays visible. Your cumulative holdings remain hidden until you reveal
              them locally.
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={togglePortfolioVisible}>
            {isPortfolioVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {isPortfolioVisible ? 'Hide values' : 'Reveal values'}
          </Button>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="glass-card rounded-3xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Markets tracked
            </p>
            <p className="mt-3 font-mono text-3xl text-foreground">{markets.length}</p>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Private positions
            </p>
            <p className="mt-3 font-mono text-3xl text-foreground">
              {!isPortfolioVisible ? '••' : privatePortfolio.isLoading ? '...' : openPositions.length}
            </p>
          </div>
          <div className="glass-card rounded-3xl p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Finalized markets
            </p>
            <p className="mt-3 font-mono text-3xl text-foreground">
              {markets.filter((market) => market.status === 'FINALIZED').length}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="glass-card rounded-3xl p-10 text-sm text-muted-foreground">
            Loading market registry...
          </div>
        ) : null}

        {isError && error ? (
          <div className="glass-card rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
            {error.message}
          </div>
        ) : null}

        {privatePortfolio.isError && privatePortfolio.error ? (
          <div className="glass-card rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
            {privatePortfolio.error.message}
          </div>
        ) : null}

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Ticket className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
              Open Positions
            </h2>
          </div>

          {!isPortfolioVisible ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
              Reveal locally to decrypt your current holdings. Nothing public is added to the chain.
            </div>
          ) : openPositions.length === 0 ? (
            <div className="glass-card rounded-3xl p-10 text-center text-sm text-muted-foreground">
              No revealed positions found for this wallet yet.
            </div>
          ) : (
            <div className="space-y-3">
              {openPositions.map(({ market, outcome, shares }) => (
                <div
                  key={`${market.marketId}-${outcome.id}`}
                  className="glass-card flex flex-col gap-6 rounded-3xl p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {market.category}
                    </p>
                    <p className="text-lg font-semibold text-foreground">{market.title}</p>
                    <p className="text-sm text-muted-foreground">{market.description}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
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

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
              Privacy Notes
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="glass-card rounded-3xl p-6">
              <Activity className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Market prices, reserves, and probabilities remain public.
              </p>
            </div>
            <div className="glass-card rounded-3xl p-6">
              <Ticket className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Your cumulative per-outcome balance is encrypted on-chain.
              </p>
            </div>
            <div className="glass-card rounded-3xl p-6">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">
                Winning shares can be redeemed after finalization through the market detail page.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default function MyBetsPage(): JSX.Element {
  return (
    <CofheBetProvider>
      <PortfolioDesk />
    </CofheBetProvider>
  );
}
