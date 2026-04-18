'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronRight,
  Gavel,
  LockKeyhole,
  Scale,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  detail: string;
};

type MarketRow = {
  market: string;
  state: string;
  liquidity: string;
  close: string;
};

type Principle = {
  title: string;
  body: string;
};

type WorkflowStep = {
  label: string;
  title: string;
  body: string;
  icon: typeof LockKeyhole;
};

const METRICS: Metric[] = [
  {
    label: 'Protected volume',
    value: '$12.4M',
    detail: 'Simulated encrypted order flow across active event books.',
  },
  {
    label: 'Open markets',
    value: '148',
    detail: 'Binary and multi-outcome markets surfaced through a single desk.',
  },
  {
    label: 'Oracle SLA',
    value: '48h',
    detail: 'Resolution window with disputes and final settlement discipline.',
  },
];

const MARKET_ROWS: MarketRow[] = [
  {
    market: 'Will ETH settle above $5,000 on December 31?',
    state: 'ACTIVE',
    liquidity: '$1.84M',
    close: '12d 14h',
  },
  {
    market: 'Which L2 leads stablecoin transfer volume in Q3?',
    state: 'ACTIVE',
    liquidity: '$620k',
    close: '5d 03h',
  },
  {
    market: '2026 Fed path: Hold / 25 bps / 50 bps / Emergency cut',
    state: 'PROPOSED',
    liquidity: '$940k',
    close: 'Awaiting oracle',
  },
  {
    market: 'Will spot ETH ETF weekly inflows exceed $2B this month?',
    state: 'DISPUTED',
    liquidity: '$420k',
    close: 'Challenge window',
  },
];

const PRINCIPLES: Principle[] = [
  {
    title: 'Calm, not casino',
    body: 'Serious prediction products should prioritize legibility, timing, and capital clarity over spectacle. The interface should feel closer to a terminal than a token launch page.',
  },
  {
    title: 'Numbers carry the hierarchy',
    body: 'Liquidity, close time, status, and collateral type should dominate the composition. Brand elements should support trust, not compete with the market data.',
  },
  {
    title: 'Privacy should look disciplined',
    body: 'Encrypted execution is a control surface, not a gimmick. Use restrained signals, audit-like language, and quiet motion so the product feels dependable.',
  },
];

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    label: '01',
    title: 'Commit privately',
    body: 'Amounts are encrypted client-side before submission, so the chain records activity without exposing the trader’s position.',
    icon: LockKeyhole,
  },
  {
    label: '02',
    title: 'Resolve with accountability',
    body: 'Oracles resolve markets through a defined workflow with staking, dispute windows, and explicit settlement status.',
    icon: Gavel,
  },
  {
    label: '03',
    title: 'Claim with finality',
    body: 'Settlement should feel procedural and calm: permit, verify, claim, and move on. No confetti, no hype copy, just completion.',
    icon: Scale,
  },
];

function statusTone(state: string): string {
  if (state === 'ACTIVE') {
    return 'bg-primary/15 text-primary border-primary/30';
  }

  if (state === 'PROPOSED') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-300';
  }

  if (state === 'DISPUTED') {
    return 'border-red-400/20 bg-red-400/10 text-red-300';
  }

  return 'border-white/10 bg-white/[0.04] text-muted-foreground';
}

function fadeUp(index: number): {
  initial: { opacity: number; y: number };
  whileInView: { opacity: number; y: number };
  viewport: { once: true; margin: string };
  transition: { duration: number; delay: number };
} {
  return {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.45, delay: index * 0.06 },
  };
}

export default function LandingPage(): JSX.Element {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-40 terminal-grid" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            </div>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">CipherMarket</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Private Prediction Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-white/20 hover:text-foreground sm:inline-flex"
              href="/dashboard"
            >
              View markets
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_rgba(141,37,31,0.25)] transition-all hover:bg-primary/92"
              href="/markets/create"
            >
              Create market
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 py-14 lg:px-10 lg:py-20">
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
          <motion.div {...fadeUp(0)} className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary">
                Confidential execution surface
              </span>
            </div>

            <div className="max-w-3xl space-y-5">
              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-6xl">
                Serious prediction markets should feel like capital is at stake.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                A strong prediction product should look restrained, precise, and
                information-led. The right mood is part market terminal, part settlement
                console: quiet surfaces, strong hierarchy, obvious states, and no decorative
                noise fighting the data.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_rgba(141,37,31,0.28)] transition-all hover:bg-primary/92"
                href="/dashboard"
              >
                Open the desk
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-xl border border-white/10 px-5 py-3 text-sm text-foreground transition-colors hover:border-white/20 hover:bg-white/[0.03]"
                href="/oracle"
              >
                Review oracle workflow
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {METRICS.map((metric, index) => (
                <motion.div
                  key={metric.label}
                  {...fadeUp(index + 1)}
                  className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-xl"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-3 font-mono text-3xl font-semibold tracking-tight text-foreground">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {metric.detail}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            {...fadeUp(2)}
            className="glass-card relative overflow-hidden rounded-[28px] border-white/8 p-6"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">
                  Market board
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  How the home view should feel
                </h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1219]">
              <div className="grid grid-cols-[minmax(0,1.5fr)_auto_auto_auto] gap-3 border-b border-white/8 px-4 py-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span>Market</span>
                <span>Status</span>
                <span className="text-right">Liquidity</span>
                <span className="text-right">Close</span>
              </div>

              <div className="divide-y divide-white/6">
                {MARKET_ROWS.map((row, index) => (
                  <motion.div
                    key={row.market}
                    {...fadeUp(index + 3)}
                    className="grid grid-cols-[minmax(0,1.5fr)_auto_auto_auto] items-center gap-3 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{row.market}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        Encrypted position book
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(row.state)}`}
                    >
                      {row.state}
                    </span>
                    <span className="text-right font-mono text-sm text-foreground">
                      {row.liquidity}
                    </span>
                    <span className="text-right font-mono text-sm text-muted-foreground">
                      {row.close}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <TimerReset className="h-4 w-4 text-primary" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Resolution discipline
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Expiry, proposal, dispute, and settlement should read as explicit operating
                  states, not as decorative badges.
                </p>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <Scale className="h-4 w-4 text-primary" />
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Capital clarity
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Prices, collateral, depth, and timing should sit above brand voice. That is
                  what makes the product feel trustworthy.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-10 lg:px-10 lg:pb-16">
        <div className="grid gap-5 lg:grid-cols-3">
          {PRINCIPLES.map((principle, index) => (
            <motion.article
              key={principle.title}
              {...fadeUp(index + 1)}
              className="rounded-3xl border border-white/8 bg-white/[0.02] p-6 backdrop-blur-xl"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                Design principle
              </p>
              <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{principle.body}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="relative z-10 border-t border-white/5">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-12 lg:grid-cols-3 lg:px-10">
          {WORKFLOW_STEPS.map((step, index) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.title}
                {...fadeUp(index + 1)}
                className="rounded-3xl border border-white/8 bg-white/[0.02] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                    {step.label}
                  </span>
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-5 text-xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.body}</p>
              </motion.article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
