import MarketList from '@/components/markets/MarketList';
import MarketStatsGrid from '@/components/markets/MarketStatsGrid';
import OnboardingChecklist from '@/components/dashboard/OnboardingChecklist';

export default function DashboardPage(): JSX.Element {
  return (
    <div className="pt-8 pb-16 mt-20 space-y-12">
      <header className="space-y-6">
        {/* <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Protocol Intelligence
        </div> */}
        <div className="space-y-3">
          <h1 className="text-[34px] lg:text-[48px] leading-[1.1] tracking-[-0.04em] font-bold text-white">
            <span className="font-serif italic text-[#e8e4df]">Explore</span>
            <span className="font-light text-white/30 ml-3">the books.</span>
          </h1>
          <p className="max-w-xl text-sm text-white/35 leading-relaxed">
            Market prices, reserves, and probabilities remain public to keep quotes honest.
            Your cumulative position stays hidden behind FHE encryption.
          </p>
        </div>
      </header>

      <MarketStatsGrid />

      <div className="grid gap-12">
        <main>
          <MarketList
            description="Institutional-grade liquidity pools with encrypted individual books."
            heading="Featured Markets"
          />
        </main>

        <aside className="space-y-8">
          <OnboardingChecklist />

          <div className="glass-card rounded-[32px] p-6 border border-white/5 bg-white/[0.02] space-y-3">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest font-mono">
              Privacy Shield
            </h3>
            <p className="text-[11px] text-white/25 leading-relaxed">
              CipherMarket uses Fhenix FHE Coprocessors to ensure that no one—including the protocol—can see your individual bets. Only the aggregate pool state is public.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
