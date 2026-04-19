import Link from 'next/link';
import { ArrowRight, ChevronRight, Clock3, Gavel, LockKeyhole, Scale, ShieldCheck } from 'lucide-react';

type FeaturedMarket = {
  id: string;
  title: string;
  category: string;
  close: string;
  liquidity: string;
  note: string;
  outcomes: Array<{
    label: string;
    probability: number;
    tone: 'signal' | 'neutral' | 'warning';
  }>;
};

type DesignPrinciple = {
  title: string;
  body: string;
};

type WorkflowStep = {
  id: string;
  title: string;
  body: string;
  icon: typeof LockKeyhole;
};

const featuredMarkets: FeaturedMarket[] = [
  {
    id: '001',
    title: 'Will ETH settle above $5,000 by December 31, 2026?',
    category: 'Crypto Macro',
    close: '12d 14h',
    liquidity: '$1.84M',
    note: 'Probabilities derived from encrypted market state.',
    outcomes: [
      { label: 'Yes', probability: 61, tone: 'signal' },
      { label: 'No', probability: 39, tone: 'neutral' },
    ],
  },
  {
    id: '002',
    title: 'Which L2 leads stablecoin transfer volume in Q3 2026?',
    category: 'Multi Outcome',
    close: '5d 03h',
    liquidity: '$620k',
    note: 'Rounded liquidity shown; individual positions remain private.',
    outcomes: [
      { label: 'Base', probability: 42, tone: 'signal' },
      { label: 'Arbitrum', probability: 31, tone: 'neutral' },
      { label: 'Solana VM', probability: 27, tone: 'warning' },
    ],
  },
  {
    id: '003',
    title: 'Will weekly ETH ETF inflows exceed $2B before month-end?',
    category: 'Event Market',
    close: '2d 09h',
    liquidity: '$420k',
    note: 'Visible market state, hidden personal book.',
    outcomes: [
      { label: 'Above $2B', probability: 34, tone: 'neutral' },
      { label: 'Below $2B', probability: 66, tone: 'signal' },
    ],
  },
];

const designPrinciples: DesignPrinciple[] = [
  {
    title: 'Private in data, transparent in behavior',
    body: 'Users should always understand what the market is doing. If a quote is delayed or a claim needs decryption, the interface should say so plainly instead of pretending everything is instant.',
  },
  {
    title: 'Market structure first',
    body: 'A serious prediction product should foreground outcome prices, liquidity, close time, and resolution state. Privacy changes what is visible, but it should never make the product feel vague.',
  },
  {
    title: 'Trust through restraint',
    body: 'Strong products in this category feel measured. Clean typography, disciplined status colors, and quiet motion make the system feel dependable when money and uncertainty are involved.',
  },
];

const workflowSteps: WorkflowStep[] = [
  {
    id: '01',
    title: 'Price the market normally',
    body: 'Browse outcome probabilities, rounded liquidity, and resolution timing as you would in any serious prediction venue. What matters is still visible.',
    icon: ShieldCheck,
  },
  {
    id: '02',
    title: 'Trade without publishing your book',
    body: 'When you submit size, the position is encrypted before it is written on-chain. The market can keep moving without turning your personal conviction into public content.',
    icon: LockKeyhole,
  },
  {
    id: '03',
    title: 'Resolve with clear operational states',
    body: 'Markets move from trading to proposal, dispute, and final settlement with explicit status changes. The product should read like a system with procedure, not a black box.',
    icon: Gavel,
  },
  {
    id: '04',
    title: 'Claim simply',
    body: 'Winning should end in a short, obvious flow: reveal what needs revealing, verify the amount, submit the claim, and receive the payout.',
    icon: Scale,
  },
];

function outcomeToneClasses(tone: FeaturedMarket['outcomes'][number]['tone']): string {
  if (tone === 'signal') {
    return 'border-primary/25 bg-primary/10 text-primary';
  }

  if (tone === 'warning') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  }

  return 'border-white/10 bg-white/[0.03] text-foreground';
}

export default function LandingPage(): JSX.Element {
  return (
    <main className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 opacity-35 terminal-grid" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">CipherMarket</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Private Prediction Market
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <Link className="transition-colors hover:text-foreground" href="/dashboard">
              Markets
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/markets/create">
              Create
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/oracle">
              Oracle Desk
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-16 lg:px-10 lg:pb-20 lg:pt-24">
        <div className="grid items-start gap-14 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
                Private market structure on Fhenix
              </span>
            </div>

            <div className="max-w-4xl space-y-6">
              <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-5xl lg:text-6xl">
                Trade conviction without turning your position into public entertainment.
              </h1>

              <div className="max-w-2xl space-y-4 text-base leading-8 text-muted-foreground sm:text-lg">
                <p>
                  CipherMarket is a prediction market built for a reality most interfaces ignore:
                  traders want price discovery, but they do not necessarily want their personal
                  size, timing, or side exposed in full public view.
                </p>
                <p>
                  The market should still feel normal where it matters. You can read the question,
                  compare outcomes, understand the probability surface, check liquidity, and follow
                  the resolution timeline. What stays private is your book, not the product&apos;s
                  behavior.
                </p>
                <p>
                  That is the standard here: transparent in behavior, private in data. No cryptography
                  theater. No numbers mysteriously disappearing. Just a more disciplined market interface.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_rgba(141,37,31,0.28)] transition-all hover:bg-primary/92"
                href="/dashboard"
              >
                Open Market Desk
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-foreground transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                href="/markets/create"
              >
                Author A Market
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Readable market state',
                  value: 'Probabilities, close times, and rounded liquidity remain visible.',
                },
                {
                  label: 'Hidden personal positions',
                  value: 'Individual stake sizing and account-level positions are not exposed by default.',
                },
                {
                  label: 'Clear settlement path',
                  value: 'Proposal, dispute, and claim states are surfaced directly in the product.',
                },
              ].map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-xl"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                    {item.label}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.value}</p>
                </article>
              ))}
            </div>
          </div>

          <section className="glass-card rounded-[30px] border-white/8 p-6">
            <div className="flex items-center justify-between border-b border-white/6 pb-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
                  Featured Markets
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  Market discovery should still look like market discovery
                </h2>
              </div>
              <Clock3 className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-6 space-y-4">
              {featuredMarkets.map((market) => (
                <article
                  key={market.id}
                  className="rounded-3xl border border-white/8 bg-[#0d1219] p-5 transition-colors hover:border-white/12"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        {market.category}
                      </p>
                      <h3 className="text-base font-medium leading-7 text-foreground">
                        {market.title}
                      </h3>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      #{market.id}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted-foreground">
                    <span>Liquidity {market.liquidity}</span>
                    <span>Close {market.close}</span>
                  </div>

                  <div className="mt-5 space-y-3">
                    {market.outcomes.map((outcome) => (
                      <div key={outcome.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground">{outcome.label}</span>
                          <span className="font-mono text-foreground">{outcome.probability}%</span>
                        </div>
                        <div className="h-11 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
                          <div
                            className={`flex h-full items-center justify-between px-4 ${outcomeToneClasses(outcome.tone)}`}
                            style={{ width: `${outcome.probability}%` }}
                          >
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                              Buy
                            </span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-4 text-xs leading-6 text-muted-foreground">{market.note}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-12 lg:px-10 lg:pb-20">
        <div className="grid gap-5 lg:grid-cols-3">
          {designPrinciples.map((principle) => (
            <article
              key={principle.title}
              className="rounded-3xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-xl"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                Design principle
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
          <div className="max-w-3xl space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              Product Behavior
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              If private computation introduces delay, the interface should acknowledge it.
            </h2>
            <p className="max-w-2xl text-base leading-8 text-muted-foreground">
              A privacy product should not try to imitate instant certainty when some values genuinely
              require secure computation. Quote states, decryption states, and claim states should all
              read as part of the workflow, not as unexplained latency.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-4">
            {workflowSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article
                  key={step.id}
                  className="rounded-3xl border border-white/8 bg-white/[0.02] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                      {step.id}
                    </span>
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-18">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
              Final Mental Model
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Start with the interface a good prediction market deserves. Then hide only what must stay private.
            </h2>
            <div className="max-w-3xl space-y-4 text-base leading-8 text-muted-foreground">
              <p>
                That means market discovery still feels familiar. Trade panels still explain price,
                fees, and timing. Portfolios still show your own positions clearly. Resolution still
                ends in an obvious claim state.
              </p>
              <p>
                Privacy is not the headline act. It is the constraint the product respects while
                preserving trust, clarity, and flow.
              </p>
            </div>
          </div>

          <aside className="rounded-3xl border border-primary/20 bg-primary/10 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Next Step
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
              Open the desk and review the market shell in motion.
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              The app routes now load through a lighter shell, with the heavier wallet and encryption
              paths scoped to where they are actually used.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/92"
                href="/dashboard"
              >
                Enter Market Desk
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-foreground transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                href="/oracle"
              >
                Review Resolution Workflow
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
