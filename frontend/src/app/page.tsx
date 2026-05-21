'use client';
import Link from 'next/link';
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Zap,
  Cpu,
  Fingerprint,
  Activity,
  BarChart3,
  Globe,
  Lock,
  EyeOff,
  Scale,
  Binary,
  Database,
  Search,
  ChevronRight
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PrivacyBadge from '@/components/ui/PrivacyBadge';
import Button from '@/components/ui/Button';
import clsx from 'clsx';

const TERMINAL_LINES = [
  { text: '$ cipher market quote --private', color: 'text-white/40', delay: 0 },
  { text: '> Pool odds public. Wallet position sealed.', color: 'text-primary/70', delay: 400 },
  { text: '> CoFHE self-permit ready.', color: 'text-primary', delay: 1000 },
  { text: '$ cipher buy --outcome YES --amount 0.03', color: 'text-white/60', delay: 1600 },
  { text: '> Encrypting trade intent...', color: 'text-white/40', delay: 2200 },
  { text: '> Position handle: 0x8d...f901', color: 'text-emerald-400', delay: 3000 },
  { text: '> SUCCESS: shares minted, position hidden.', color: 'text-primary font-bold', delay: 3800 },
] as const;

const HERO_MARKETS = [
  { label: 'Lagos Rain', odds: '64%', color: '#38bdf8' },
  { label: 'ARB Gas Spike', odds: '41%', color: '#f97316' },
  { label: 'BTC Flow Day', odds: '72%', color: '#22c55e' },
] as const;

function TerminalMockup(): JSX.Element {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setStep(i + 1), line.delay),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 group bg-black">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
            <div className="w-2 h-2 rounded-full bg-white/10" />
          </div>
          <span className="ml-4 text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase">cipher-fhe-client</span>
        </div>
        <Fingerprint className="h-4 w-4 text-white/10 group-hover:text-primary transition-colors" />
      </div>
      <div className="p-8 font-mono text-[13px] leading-relaxed min-h-[280px]">
        <div className="space-y-1.5">
          {TERMINAL_LINES.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={step > i ? { opacity: 1, x: 0 } : {}}
              className={line.color}
            >
              {line.text}
            </motion.div>
          ))}
          {step < TERMINAL_LINES.length && (
            <motion.span
              animate={{ opacity: [0, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-2 h-4 bg-primary/40"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage(): JSX.Element {
  return (
    <div className="relative max-w-[1400px] px-8 lg:px-16 mx-auto space-y-56 py-28 bg-black">
      {/* ── HERO SECTION ── */}
      <section className="relative min-h-[90vh] flex flex-col justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-8 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <div className="pointer-events-none absolute -right-24 top-24 h-72 w-72 rounded-full border border-primary/15" />
        <div className="pointer-events-none absolute -left-16 bottom-20 h-56 w-56 rounded-full border border-sky-300/10" />
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-24 items-center">

          <div className="space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <div className="h-px w-10 bg-primary/40" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.5em] text-primary/80">
                confidential prediction market
              </span>
            </motion.div>

            <div className="space-y-10">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-[72px] lg:text-[96px] xl:text-[116px] leading-[0.84] tracking-tighter font-serif italic text-white"
              >
                Trade the<br />
                <span className="font-sans font-light not-italic text-white/12">unknown.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-lg lg:text-xl text-white/40 font-light leading-relaxed max-w-xl"
              >
                Public odds, private positions. CipherMarket uses <span className="text-white/80">CoFHE encryption</span> so markets stay readable
                while your individual book stays sealed.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-wrap gap-8"
            >
              <Link href="/dashboard">
                <Button size="lg" className="h-16 px-10 gap-4 group/btn">
                  Open Markets
                  <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                </Button>
              </Link>
              <Link href="#protocol">
                <Button variant="outline" size="lg" className="h-16 px-10">
                  How it works
                </Button>
              </Link>
            </motion.div>

            <div className="grid gap-3 sm:grid-cols-3 pt-14 border-t border-white/10">
              {[
                { label: 'Position Privacy', value: 'FHE' },
                { label: 'Resolution Window', value: '5m' },
                { label: 'Test Network', value: 'Arbitrum' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                  <p className="text-3xl font-serif italic text-white/90">{stat.value}</p>
                  <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.3em] text-white/28">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="relative hidden lg:block"
          >
            <TerminalMockup />

            <div className="absolute -left-8 -top-10 w-64 rounded-2xl border border-white/10 bg-black/90 p-4 shadow-2xl">
              <p className="mb-4 text-[9px] font-mono uppercase tracking-[0.28em] text-white/25">Live odds</p>
              <div className="space-y-3">
                {HERO_MARKETS.map((market) => (
                  <div key={market.label} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.14em]">
                      <span className="text-white/45">{market.label}</span>
                      <span style={{ color: market.color }}>{market.odds}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full" style={{ width: market.odds, backgroundColor: market.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="absolute -bottom-8 -right-8 p-10 rounded-2xl w-80 space-y-8 border border-white/10 bg-black shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PrivacyBadge state="sealed" size="sm" />
                  <span className="text-[10px] font-mono text-white/20">mId: 0x4f...</span>
                </div>
                <div className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">Locked</div>
              </div>
              <div className="space-y-3">
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '74%' }}
                    transition={{ delay: 1.5, duration: 1.5 }}
                    className="h-full bg-primary"
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-white/30 uppercase tracking-widest font-bold">
                  <span>Private Balance</span>
                  <span className="text-white/80">74.2%</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── SECURITY ARCHITECTURE ── */}
      <section id="protocol" className="space-y-20 py-2">
        <div className="max-w-3xl space-y-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.5em] text-primary font-bold">Security Architecture</p>
          <h2 className="text-5xl lg:text-7xl font-serif italic text-white leading-tight">
            Privacy as a first-class<br />
            <span className="font-sans font-light text-white/10 not-italic">on-chain primitive.</span>
          </h2>
          <p className="text-xl text-white/40 font-light max-w-xl leading-relaxed">
            CipherMarket leverages Fhenix FHE Coprocessors to enable encrypted state transitions without ever revealing individual balances.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            {
              title: 'Client-Side Encryption',
              desc: 'Positions are encrypted using CoFHE SDK before network submission.',
              icon: Lock
            },
            {
              title: 'Encrypted Summation',
              desc: 'Aggregate liquidity is computed directly on ciphertexts on-chain.',
              icon: Binary
            },
            {
              title: 'Coprocessor Verification',
              desc: 'High-performance FHE circuits ensure zero-knowledge finality.',
              icon: Cpu
            },
            {
              title: 'Staked Resolution',
              desc: 'Staked oracles propose, vote, and resolve with short testnet windows.',
              icon: Scale
            }
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 rounded-2xl border border-white/5 bg-white/[0.01] space-y-8 group hover:border-primary/40 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white/[0.03] border border-white/5 group-hover:text-primary transition-colors">
                <item.icon className="h-7 w-7" />
              </div>
              <div className="space-y-3">
                <h4 className="text-xl font-bold text-white tracking-tight">{item.title}</h4>
                <p className="text-sm text-white/30 leading-relaxed font-light">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── USE CASES ── */}
      <section className="py-2 grid lg:grid-cols-2 gap-32 items-center border-t border-white/10 pt-40">
        <div className="space-y-16">
          <div className="space-y-8">
            <h2 className="text-5xl lg:text-6xl font-serif italic text-white leading-tight">
              Markets that demand<br />
              <span className="font-sans font-light text-white/10 not-italic">total confidentiality.</span>
            </h2>
            <p className="text-xl text-white/40 font-light max-w-xl leading-relaxed">
              From institutional hedging to high-alpha political analysis, CipherMarket is built for participants who cannot afford to leak conviction.
            </p>
          </div>

          <div className="grid gap-8">
            {[
              { label: 'Institutional Hedging', icon: TrendingUp, detail: 'Hedge portfolio risk without revealing your exact exposure levels to the market.' },
              { label: 'Global Macro Analysis', icon: Globe, detail: 'Place directional bets on macro-economic shifts with total position security.' },
              { label: 'Corporate Intelligence', icon: Search, detail: 'Analyze industry outcomes while maintaining strategic strategic privacy.' }
            ].map((useCase) => (
              <div key={useCase.label} className="flex gap-8 p-8 rounded-2xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-all group">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center group-hover:text-primary transition-colors">
                  <useCase.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-lg font-bold text-white/90">{useCase.label}</p>
                  <p className="text-sm text-white/30 font-light leading-relaxed">{useCase.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-[40px] p-12 border border-white/10 bg-black overflow-hidden shadow-2xl space-y-12">
            <div className="flex items-center justify-between px-2">
              <div className="space-y-2">
                <p className="text-[11px] font-mono text-white/30 uppercase tracking-[0.4em]">Active Intelligence Feed</p>
                <h4 className="text-2xl font-bold text-white italic font-serif tracking-tight">Market Skew Analysis</h4>
              </div>
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-black bg-white/10" />)}
              </div>
            </div>

            <div className="space-y-10">
              {[
                { label: 'ECB Rate Decision', vol: '$4.2M', skew: 62 },
                { label: 'US Election Finality', vol: '$12.4M', skew: 48 },
                { label: 'BTC ETF Net Flows', vol: '$1.8M', skew: 72 }
              ].map((item) => (
                <div key={item.label} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <p className="text-base font-bold text-white/60">{item.label}</p>
                    <p className="text-[12px] font-mono text-white/30">{item.vol} Volume</p>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary/80" style={{ width: `${item.skew}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 flex justify-center">
              <Link href="/dashboard" className="text-[11px] font-mono text-primary uppercase tracking-[0.5em] font-bold hover:text-white transition-colors flex items-center gap-3">
                View Full Feed <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-2">
        <div className="rounded-[64px] p-32 lg:p-16 text-center space-y-16 relative overflow-hidden border border-white/10 bg-black shadow-2xl">
          <div className="relative space-y-8">
            <h2 className="text-4xl lg:text-6xl font-serif italic text-white tracking-tight leading-[0.85]">
              The future of finance<br />
              <span className="font-sans font-light not-italic text-white/5">is dark.</span>
            </h2>
            <p className="text-xl text-white/40 max-w-2xl mx-auto font-light leading-relaxed">
              Join the institutional-grade prediction infrastructure built for the next era of decentralized finance.
            </p>
          </div>

          <div className="relative flex justify-center gap-8">
            <Link href="/dashboard">
              <Button size="md" className="h-16 px-12 gap-4">
                Open Markets
                <ArrowRight className="h-6 w-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
