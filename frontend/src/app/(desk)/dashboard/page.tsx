import MarketList from '@/components/markets/MarketList';

export default function DashboardPage(): JSX.Element {
  return (
    <div className="pt-8 pb-12">
      {/* <header className="mb-10">
        <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
          Market Explorer
        </div>
        <h1 className="text-[34px] lg:text-[42px] leading-[1.1] tracking-[-0.04em] mb-4">
          <span className="font-serif italic text-[#e8e4df]">Explore</span>
          <br />
          <span className="font-sans font-light text-white/35">the markets.</span>
        </h1>
      </header> */}

      <main>
        <MarketList
          description="Markets stay legible even when positions do not. Review probabilities, liquidity, and resolution state without exposing individual books."
          heading="Featured markets"
        />
      </main>
    </div>
  );
}
