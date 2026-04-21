import CreateMarketForm from '@/components/markets/CreateMarketForm';

export default function Page(): JSX.Element {
  return (
    <div className="pt-8 pb-12">
      {/* <header className="mb-10">
        <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
          Market Authoring
        </div>
        <h1 className="text-[34px] lg:text-[42px] leading-[1.1] tracking-[-0.04em] mb-4">
          <span className="font-serif italic text-[#e8e4df]">Create</span>
          <br />
          <span className="font-sans font-light text-white/35">a new market.</span>
        </h1>
      </header> */}

      <main>
        <div className="max-w-5xl space-y-3">
          <CreateMarketForm />
        </div>
      </main>
    </div>
  );
}
