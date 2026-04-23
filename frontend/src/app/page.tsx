'use client';
import Link from 'next/link';
import { ArrowRight, Eye, EyeOff, Gavel, Lock, Shield, TrendingUp, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import LandingNav from '@/components/layout/LandingNav';
import LandingFooter from '@/components/layout/LandingFooter';
import useMarkets from '@/hooks/useMarkets';
import { formatRelativeExpiry, formatTokenAmount } from '@/lib/formatters';

/*
  FONTS — add to globals.css:
  @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500&family=Geist+Mono:wght@400;500&display=swap');

  TAILWIND — add to tailwind.config.ts:
  fontFamily: {
    serif: ['Instrument Serif', 'Georgia', 'serif'],
    sans:  ['Geist', 'sans-serif'],
    mono:  ['Geist Mono', 'monospace'],
  }
*/

type WorkflowStep = {
  id: string;
  title: string;
  body: string;
  icon: typeof Lock;
};

type SecurityRow = {
  actor: string;
  can: string[];
  cannot: string[];
};

const workflowSteps: WorkflowStep[] = [
  {
    id: '01',
    title: 'Encrypt client-side',
    body: 'Your stake is encrypted locally using the CoFHE SDK before it ever touches the network. No server sees plaintext.',
    icon: Lock,
  },
  {
    id: '02',
    title: 'Submit ciphertext',
    body: 'The FHE ciphertext is submitted on-chain. The contract accumulates encrypted totals without decrypting individual positions.',
    icon: Shield,
  },
  {
    id: '03',
    title: 'Oracle resolves',
    body: 'A staked oracle proposes the outcome. A 48-hour dispute window allows challengers to contest with evidence.',
    icon: Gavel,
  },
  {
    id: '04',
    title: 'Claim privately',
    body: 'Winners generate a permit and claim rewards. Only your wallet can decrypt your stake — not the operator, not the oracle.',
    icon: Eye,
  },
];

const securityRows: SecurityRow[] = [
  { actor: 'Your wallet', can: ['Read own stake (permit required)'], cannot: [] },
  { actor: 'Other users', can: [], cannot: ['Read any position'] },
  { actor: 'Oracle', can: ['Propose outcome'], cannot: ['Read positions'] },
  { actor: 'Contract owner', can: ['Resolve disputes'], cannot: ['Read positions'] },
  { actor: 'Anyone', can: ['See aggregate pool totals'], cannot: [] },
];

function toneBg(index: number): string {
  if (index === 0) return 'bg-[#e8533a]/10 border-r border-[#e8533a]/25 text-[#e8533a]';
  if (index === 1) return 'bg-white/[0.04] border-r border-white/10 text-white/30';
  return 'bg-amber-500/10 border-r border-amber-500/20 text-amber-400';
}

const TERMINAL_LINES = [
  { text: '$ cipher encrypt --amount 500 --outcome YES', color: 'text-white/60', delay: 0 },
  { text: '> Generating FHE ciphertext...', color: 'text-[#D66A61]/70', delay: 600 },
  { text: '> *************** ✓ encrypted', color: 'text-[#D66A61]', delay: 1200 },
  { text: '> Submitting to PredictionMarket.sol...', color: 'text-white/60', delay: 1800 },
  { text: '> tx: 0x8d4c...f901 confirmed', color: 'text-white/40', delay: 2400 },
  { text: '> Position sealed. No observer can read your stake.', color: 'text-[#D66A61]/90', delay: 3000 },
] as const;

function TerminalMockup(): JSX.Element {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = TERMINAL_LINES.map((line, i) =>
      setTimeout(() => setStep(i + 1), line.delay + 400),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#080C14] overflow-hidden shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="w-3 h-3 rounded-full bg-red-500/40" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/40" />
        <div className="w-3 h-3 rounded-full bg-[#e8533a]/30" />
        <span className="ml-3 text-xs font-mono text-white/20">cipher-client — bash</span>
      </div>
      {/* Terminal body */}
      <div className="p-6 font-mono text-sm space-y-2 min-h-[220px]">
        {TERMINAL_LINES.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={step > i ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.3 }}
            className={line.color}
          >
            {line.text}
          </motion.div>
        ))}
        {step < TERMINAL_LINES.length && (
          <span className="inline-block w-2 h-4 bg-[#D66A61]/60 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export default function LandingPage(): JSX.Element {
  const { data: markets, isLoading: marketsLoading, isError: isMarketsError } = useMarkets();
  const featuredMarkets = useMemo(() => {
    const activeMarkets = markets.filter((market) => market.status === 'ACTIVE');
    const source = activeMarkets.length >= 3 ? activeMarkets : markets;
    return source.slice(0, 3);
  }, [markets]);

  return (
    <div className="relative z-10 font-sans max-w-[80%] px-8 lg:px-16 mx-auto">
      {/* ── HERO ── */}
      <section className="relative z-10 pt-18 pb-20 lg:pt-24 lg:pb-24">
        <div className="grid lg:grid-cols-[1fr_1fr] gap-32 items-center">

          {/* Left */}
          <div className="max-w-[560px]">
            <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a] animate-pulse" />
              Live on Ethereum Sepolia · FHE enabled
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-[52px] lg:text-[68px] xl:text-[78px] leading-[0.95] tracking-[-0.04em] mb-6">
                <span className="font-serif italic text-[#e8e4df]">Predict.</span>
                <br />
                <span className="font-sans font-light text-white/35">Stay sealed.</span>
              </h1>

              <p className="text-[16px] leading-[1.85] text-white/45 font-light max-w-[520px] mb-8">
                The first prediction market where your positions are encrypted end-to-end using Fully Homomorphic Encryption. Place bets without exposing your strategy, wallet, or stake to anyone — on-chain or off.
              </p>

              <div className="flex flex-wrap gap-3 mb-12">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 bg-[#e8533a] text-white text-[14px] font-medium px-5 py-3 rounded-xl hover:bg-[#d44830] transition-all hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(232,83,58,0.25)]"
                >
                  Open Markets <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 text-[14px] text-white/50 border border-white/10 px-5 py-3 rounded-xl hover:text-white/80 hover:border-white/20 hover:bg-white/[0.03] transition-all"
                >
                  How it works
                </Link>
              </div>
            </motion.div>

            {/* Stats bar */}
            <div className="flex items-center gap-10 pb-8 border-b border-white/[0.07]">
              {[
                { value: '127', label: 'Total markets' },
                { value: '$2.4M', label: 'Total volume' },
                { value: '< 80ms', label: 'Avg. encryption time' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-mono text-[22px] font-medium text-[#e8e4df] tracking-[-0.03em]">{stat.value}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Market Panel */}

          {/* <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          > */}

          <aside className="rounded-[28px] border border-white/[0.09] bg-[#0d1017]/95 backdrop-blur-2xl p-6 shadow-[0_32px_80px_rgba(0,0,0,0.5)] w-full mx-auto lg:mx-0">

            <TerminalMockup />

            {/* Market preview card */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0a0d12] mt-5 p-5">
              <div
                className="card"
                style={{ marginTop: 0, padding: '0px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Will ETH be above $4,000 on Jul 1?</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      padding: '3px 8px',
                      borderRadius: 999,
                      background: 'rgba(199,80,72,0.12)"',
                      color: '#e8533a',
                      border: '1px solid rgba(199,80,72,0.24)"',
                    }}
                  >
                    ACTIVE
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'YES', pool: '68%', color: 'rgba(199,80,72,0.12)', border: 'rgba(199,80,72,0.12)', text: '#D66A61' },
                    { label: 'NO', pool: '32%', color: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.4)' },
                  ].map((o) => (
                    <div
                      key={o.label}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: o.color,
                        border: `1px solid ${o.border}`,
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Outcome</div>
                      <div style={{ fontWeight: 900, fontSize: 16, color: o.text }}>{o.label}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                        pool: ██████ ({o.pool})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </aside>
          {/* </motion.div> */}
        </div>

        {/* Proof pills — full width */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { value: '100%', label: 'Positions encrypted', icon: Lock },
            { value: '0', label: 'Plaintext leaks', icon: EyeOff },
            { value: '48h', label: 'Dispute window', icon: Clock },
          ].map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 hover:border-white/[0.12] hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-[#e8533a]" />
                  <span className="font-mono text-[15px] font-medium text-[#e8e4df] tracking-[-0.02em]">
                    {f.value}
                  </span>
                </div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                  {f.label}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="relative z-10 border-t border-white/[0.07]">
        <div className="py-16 lg:py-24">
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#e8533a] mb-4">How it works</p>
          <h2 className="font-serif italic text-[36px] lg:text-[48px] tracking-[-0.03em] text-[#e8e4df] leading-[1.05] mb-4">
            Encrypted from input<br />to settlement.
          </h2>
          <p className="text-[15px] leading-[1.85] text-white/40 font-light max-w-[560px] mb-14">
            FHE lets the smart contract compute on ciphertexts directly — no trusted relay, no off-chain coordinator. Your position stays encrypted throughout its entire lifecycle.
          </p>

          <motion.div
            className="grid lg:grid-cols-4 gap-4 mb-16"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {workflowSteps.map((step) => {
              const Icon = step.icon;
              return (
                <motion.article
                  key={step.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0 }
                  }}
                  className="group rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.035] transition-all relative overflow-hidden"
                >
                  <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e8533a]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8533a]">{step.id}</span>
                    <div className="w-8 h-8 rounded-lg bg-[#e8533a]/10 border border-[#e8533a]/20 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5 text-[#e8533a]" />
                    </div>
                  </div>
                  <h3 className="font-serif italic text-[18px] text-[#e8e4df] leading-[1.2] tracking-[-0.01em] mb-3">{step.title}</h3>
                  <p className="text-[12px] leading-[1.85] text-white/35 font-light">{step.body}</p>
                </motion.article>
              );
            })}
          </motion.div>

          {/* Code snippet */}
          <div className="rounded-[20px] border border-white/[0.08] bg-[#0a0d12] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <span className="font-mono text-[10px] text-white/25 tracking-[0.1em]">PredictionMarket.sol · placeBet</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-emerald-400/60">Solidity</span>
            </div>
            <pre className="px-6 py-5 text-[12px] leading-[1.9] font-mono text-white/40 overflow-x-auto">
              <code>{`function placeBet(
    uint256 marketId,
    uint8 outcomeIndex,
    uint128 plainStakeAmount,
    InEuint128 calldata encStake    // ← ciphertext from client
) external payable {
    euint128 stake = FHE.asEuint128(encStake);

    // Accumulate encrypted total — no individual position exposed
    encryptedOutcomeTotals[marketId][outcomeIndex] =
        FHE.add(encryptedOutcomeTotals[marketId][outcomeIndex], stake);

    // Grant persistent access only to this contract + the bettor
    FHE.allowThis(stake);
    FHE.allow(stake, msg.sender);
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* ── SECURITY MODEL ── */}
      <section id="security" className="relative z-10 border-t border-white/[0.07]">
        <div className="py-16 lg:py-24">
          <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#e8533a] mb-4">Security model</p>
          <h2 className="font-serif italic text-[36px] lg:text-[48px] tracking-[-0.03em] text-[#e8e4df] leading-[1.05] mb-4">
            What even the contract<br />owner cant see.
          </h2>
          <p className="text-[15px] leading-[1.85] text-white/40 font-light max-w-[580px] mb-14">
            FHE ciphertexts are governed by an on-chain ACL. No address — not even the deployer — can decrypt your position without an explicit permit signed by your wallet. Access control is enforced at the cryptographic layer, not by trust.
          </p>

          <div className="grid lg:grid-cols-[1fr_340px] gap-8 items-start">
            {/* Access table */}
            <div className="rounded-[20px] border border-white/[0.08] bg-[#0a0d12] overflow-hidden">
              <div className="grid grid-cols-3 px-5 py-3 border-b border-white/[0.07]">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Actor</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Can</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">Cannot</span>
              </div>
              {securityRows.map((row, i) => (
                <div
                  key={row.actor}
                  className={`grid grid-cols-3 px-5 py-4 gap-4 ${i < securityRows.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                >
                  <span className="text-[13px] text-white/60 font-medium">{row.actor}</span>
                  <div className="flex flex-col gap-1">
                    {row.can.map((c) => (
                      <span key={c} className="flex items-start gap-1.5 text-[11px] text-emerald-400/70 leading-[1.5]">
                        <span className="mt-0.5 shrink-0">✓</span>{c}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1">
                    {row.cannot.map((c) => (
                      <span key={c} className="flex items-start gap-1.5 text-[11px] text-white/25 leading-[1.5]">
                        <span className="mt-0.5 shrink-0">✗</span>{c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Callout cards */}
            <div className="flex flex-col gap-4">
              {[
                {
                  title: 'Individual positions never touch plaintext on-chain',
                  body: 'Aggregate pool totals are visible. Per-wallet stakes are not — at any point in the lifecycle.',
                },
                {
                  title: 'Oracle slashing cannot expose position data',
                  body: 'Even in a dispute, the cryptographic ACL prevents position data from being revealed.',
                },
                {
                  title: 'You control who reads your stake',
                  body: 'The permit system means only addresses you explicitly authorize can decrypt your position.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-[18px] border border-white/[0.07] bg-white/[0.02] p-5 hover:border-white/[0.12] transition-all"
                >
                  <p className="text-[12px] font-medium text-[#e8e4df] leading-[1.4] mb-2">{card.title}</p>
                  <p className="text-[11px] leading-[1.8] text-white/35 font-light">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── MARKETS ── */}
      <section id="markets" className="relative z-10 border-t border-white/[0.07]">
        <div className="py-16 lg:py-24">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.26em] text-[#e8533a] mb-4">Live Markets</p>
              <h2 className="font-serif italic text-[36px] lg:text-[48px] tracking-[-0.03em] text-[#e8e4df] leading-[1.05]">
                Everything is encrypted.<br />
                <span className="text-white/30 font-sans font-light not-italic">Even the stakes.</span>
              </h2>
            </div>
            <Link
              href="/dashboard"
              className="hidden lg:flex items-center gap-2 text-[13px] text-white/40 hover:text-white/70 transition-colors font-mono uppercase tracking-[0.15em]"
            >
              View all markets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <motion.div
            className="grid lg:grid-cols-3 gap-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.1 }
              }
            }}
          >
            {marketsLoading
              ? Array.from({ length: 3 }, (_, index) => (
                  <motion.div
                    key={`market-skeleton-${index}`}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-6"
                  >
                    <div className="h-3 w-20 rounded bg-white/[0.06]" />
                    <div className="mt-2 h-3 w-24 rounded bg-white/[0.04]" />
                    <div className="mt-5 h-16 rounded bg-white/[0.04]" />
                    <div className="mt-5 space-y-3">
                      <div className="h-10 rounded bg-white/[0.04]" />
                      <div className="h-10 rounded bg-white/[0.04]" />
                    </div>
                  </motion.div>
                ))
              : null}

            {!marketsLoading && !isMarketsError
              ? featuredMarkets.map((market) => (
                  <motion.article
                    key={market.marketId}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      show: { opacity: 1, y: 0 },
                    }}
                    className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-6 hover:border-white/[0.12] hover:bg-white/[0.035] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/25 mb-1.5">
                          {market.category}
                        </p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/20">
                          {formatRelativeExpiry(market.expiryTime)}
                        </p>
                      </div>
                      <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-emerald-400/60 bg-emerald-400/10 border border-emerald-400/15 rounded-full px-2.5 py-1">
                        {market.status}
                      </span>
                    </div>

                    <h3 className="font-serif italic text-[20px] text-[#e8e4df] leading-[1.2] tracking-[-0.015em] mb-5">
                      {market.title}
                    </h3>

                    <div className="flex flex-col gap-2.5 mb-5">
                      {market.outcomes.slice(0, 3).map((outcome, index) => (
                        <div key={outcome.label}>
                          <div className="flex justify-between text-[12px] mb-1.5">
                            <span className="text-white/50">{outcome.label}</span>
                            <span className="font-mono text-white/50">{outcome.impliedShare}%</span>
                          </div>
                          <div className="h-8 rounded-lg bg-white/[0.03] border border-white/[0.05] overflow-hidden">
                            <div
                              className={`h-full flex items-center justify-between px-3 font-mono text-[8.5px] uppercase tracking-[0.12em] ${toneBg(index)}`}
                              style={{ width: `${Math.max(outcome.impliedShare, 8)}%` }}
                            >
                              <span>Trade</span>
                              <ArrowRight className="w-2.5 h-2.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                      <span className="flex items-center gap-1.5 font-mono text-[10px] text-white/25">
                        <TrendingUp className="w-3 h-3" />
                        {formatTokenAmount(
                          market.totalLiquidity,
                          market.collateralSymbol === 'USDC' ? 6 : 18,
                          market.collateralSymbol,
                        )}
                      </span>
                      <Link
                        href={`/markets/${market.marketId}`}
                        className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/35 transition-colors hover:text-white/70"
                      >
                        View
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </motion.article>
                ))
              : null}

            {!marketsLoading && !isMarketsError && featuredMarkets.length === 0 ? (
              <div className="rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-8 text-sm text-white/35 lg:col-span-3">
                No markets are live yet. The landing page will surface new listings here as soon as
                they are created.
              </div>
            ) : null}
          </motion.div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative z-10 border-t border-white/[0.07]">
        <div className="py-16 lg:py-24">
          <div className="rounded-[28px] border border-[#e8533a]/20 bg-[#e8533a]/[0.02] p-10 lg:p-16 text-center relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 rounded-[28px]"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,83,58,0.12) 0%, transparent 65%)' }}
            />
            <p className="relative font-mono text-[9px] uppercase tracking-[0.26em] text-[#e8533a] mb-5">Ready to trade</p>
            <h2 className="relative font-serif italic text-[40px] lg:text-[58px] tracking-[-0.035em] text-[#e8e4df] leading-[1.0] mb-5">
              Your positions.<br />Your secret.
            </h2>
            <p className="relative text-[16px] leading-[1.85] text-white/40 font-light mx-auto mb-10">
              Join the only prediction market where the protocol itself cannot see your strategy.
            </p>
            <Link
              href="/dashboard"
              className="relative inline-flex items-center gap-2 bg-[#e8533a] text-white text-[15px] font-medium px-8 py-4 rounded-xl hover:bg-[#d44830] transition-all hover:-translate-y-0.5 shadow-[0_12px_40px_rgba(232,83,58,0.35)]"
            >
              Enter CipherMarket <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
