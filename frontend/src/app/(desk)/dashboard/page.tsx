import Link from 'next/link';
import { ArrowRight, LockKeyhole, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import MarketList from '@/components/markets/MarketList';
import MarketStatsGrid from '@/components/markets/MarketStatsGrid';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';
import { getOutcomeColor } from '@/lib/outcomeColors';

const heroSwatches = [0, 1, 2, 3].map((index) => getOutcomeColor(index));

export default function DashboardPage(): JSX.Element {
  return (
    <div className="mt-20 space-y-8 pb-24 pt-6 sm:space-y-10 sm:pb-16 sm:pt-8">
      {/* <header className="relative overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.025] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] md:p-8">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-1">
          <div className="grid h-full grid-cols-4">
            {heroSwatches.map((color) => (
              <span key={color.hex} style={{ backgroundColor: color.hex }} />
            ))}
          </div>
        </div>

        <div className="relative grid gap-8 lg:grid-cols-[1fr,360px] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Live market desk
            </div>
            <div className="max-w-3xl space-y-3">
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-5xl">
                Explore markets with public odds and private positions.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-white/45">
                Prices, reserves, and probabilities stay visible so the market is readable.
                Your individual books stay sealed behind FHE encryption.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/markets/create"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Create Market
              </Link>
              <a
                href="#markets"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 transition-all hover:border-white/20 hover:bg-white/[0.05] hover:text-white"
              >
                Browse Markets
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Aggregate state is public</p>
                  <p className="text-xs text-white/35">Odds and liquidity remain easy to scan.</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-300/10 text-sky-200">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Trader books are sealed</p>
                  <p className="text-xs text-white/35">Personal balances reveal only to you.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header> */}

      <MarketStatsGrid />

      <div className="grid gap-10">
        <main id="markets" className="min-w-0">
          <MarketList
            description="Institutional-grade liquidity pools with encrypted individual books."
            heading="Featured Markets"
          />
        </main>

        <aside className="space-y-6">
          {/* <OnboardingChecklist /> */}

          <div className="rounded-[28px] border border-white/8 bg-white/[0.025] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.35)]">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-white/45">
              Privacy Shield
            </h3>
            <p className="mt-3 text-[12px] leading-6 text-white/35">
              CipherMarket uses Fhenix FHE Coprocessors so no one, including the protocol, can see
              your individual bets. Only aggregate pool state is public.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
