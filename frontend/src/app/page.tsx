'use client';

import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Minimal type helpers ─────────────────────────────────────────────────────
type TickerItem = { label: string; value: string; delta: string; positive: boolean };
type StepItem = { n: string; title: string; body: string };
type StatItem = { value: string; label: string };

// ─── Encrypted ticker simulation ─────────────────────────────────────────────
const TICKER_ITEMS: TickerItem[] = [
  { label: 'ETH/USD > $4,000', value: '██████', delta: '+2.4%', positive: true },
  { label: 'Fed cuts rates Q3', value: '██████', delta: '+18.2%', positive: true },
  { label: 'BTC halving impact', value: '██████', delta: '-4.1%', positive: false },
  { label: 'S&P 500 ATH 2026', value: '██████', delta: '+7.8%', positive: true },
  { label: 'ETH/USD > $4,000', value: '██████', delta: '+2.4%', positive: true },
  { label: 'Fed cuts rates Q3', value: '██████', delta: '+18.2%', positive: true },
  { label: 'BTC halving impact', value: '██████', delta: '-4.1%', positive: false },
  { label: 'S&P 500 ATH 2026', value: '██████', delta: '+7.8%', positive: true },
];

function EncryptedTicker(): JSX.Element {
  return (
    <div className="relative overflow-hidden border-y border-white/[0.06] py-3 bg-white/[0.01]">
      <div className="flex animate-ticker gap-12 whitespace-nowrap">
        {TICKER_ITEMS.map((item, i) => (
          <div key={i} className="flex items-center gap-3 text-xs font-mono">
            <span className="text-white/30">{item.label}</span>
            <span className="text-[#4FFFD4]/40 tracking-widest">{item.value}</span>
            <span className={item.positive ? 'text-[#4FFFD4]/70' : 'text-red-400/70'}>
              {item.delta}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Animated cipher stream background ───────────────────────────────────────
function CipherRain(): JSX.Element {
  const chars = '01アイウエオカキクケコABCDEFGHIJKLMN'.split('');
  const columns = 24;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.035]">
      {Array.from({ length: columns }).map((_, col) => (
        <div
          key={col}
          className="absolute top-0 flex flex-col font-mono text-[10px] text-[#4FFFD4] leading-[18px]"
          style={{
            left: `${(col / columns) * 100}%`,
            animation: `cipherDrop ${3 + (col % 4)}s linear ${(col * 0.3) % 2}s infinite`,
          }}
        >
          {Array.from({ length: 40 }).map((_, row) => (
            <span key={row}>{chars[(col * 7 + row * 3) % chars.length]}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Terminal mockup ─────────────────────────────────────────────────────────
function TerminalMockup(): JSX.Element {
  const [step, setStep] = useState(0);

  const lines = [
    { text: '$ cipher encrypt --amount 500 --outcome YES', color: 'text-white/60', delay: 0 },
    { text: '> Generating FHE ciphertext...', color: 'text-[#4FFFD4]/70', delay: 600 },
    { text: '> [0x3f7a...c2b1] ✓ encrypted', color: 'text-[#4FFFD4]', delay: 1200 },
    { text: '> Submitting to PredictionMarket.sol...', color: 'text-white/60', delay: 1800 },
    { text: '> tx: 0x8d4c...f901 confirmed', color: 'text-white/40', delay: 2400 },
    { text: '> Position sealed. No observer can read your stake.', color: 'text-[#4FFFD4]/90', delay: 3000 },
  ];

  useEffect(() => {
    const timers = lines.map((line, i) =>
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
        <div className="w-3 h-3 rounded-full bg-[#4FFFD4]/30" />
        <span className="ml-3 text-xs font-mono text-white/20">cipher-client — bash</span>
      </div>
      {/* Terminal body */}
      <div className="p-6 font-mono text-sm space-y-2 min-h-[220px]">
        {lines.map((line, i) => (
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
        {step < lines.length && (
          <span className="inline-block w-2 h-4 bg-[#4FFFD4]/60 animate-pulse" />
        )}
      </div>
    </div>
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────
function StatBlock({ value, label }: StatItem): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        className="text-4xl font-black tracking-tight text-white font-mono"
      >
        {value}
      </motion.div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/30 font-medium">{label}</div>
    </div>
  );
}

// ─── How it works steps ───────────────────────────────────────────────────────
const STEPS: StepItem[] = [
  {
    n: '01',
    title: 'Encrypt client-side',
    body: 'Your stake is encrypted locally using the CoFHE SDK before it ever touches the network. No server sees plaintext.',
  },
  {
    n: '02',
    title: 'Submit ciphertext',
    body: 'The FHE ciphertext is submitted on-chain. The contract accumulates encrypted totals without decrypting individual positions.',
  },
  {
    n: '03',
    title: 'Oracle resolves',
    body: 'A staked oracle proposes the outcome. A 48-hour dispute window allows challengers to contest with evidence.',
  },
  {
    n: '04',
    title: 'Claim privately',
    body: 'Winners generate a permit and claim rewards. Only your wallet can decrypt your stake — not the operator, not the oracle.',
  },
];

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage(): JSX.Element {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroY = useTransform(scrollY, [0, 400], [0, -60]);

  return (
    <>
      {/* ── Global styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --teal: #4FFFD4;
          --teal-dim: rgba(79,255,212,0.08);
          --bg: #070B14;
          --surface: rgba(255,255,255,0.02);
          --border: rgba(255,255,255,0.06);
          --font-display: 'Syne', sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        html { scroll-behavior: smooth; }

        body {
          background: var(--bg);
          color: #fff;
          font-family: var(--font-display);
          overflow-x: hidden;
        }

        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-ticker { animation: ticker 24s linear infinite; }

        @keyframes cipherDrop {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.4; }
          100% { transform: translateY(100vh); opacity: 0; }
        }

        @keyframes pulseGlow {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.3; }
        }

        .glow-orb {
          border-radius: 50%;
          filter: blur(100px);
          animation: pulseGlow 5s ease-in-out infinite;
        }

        .noise-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.03;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }

        .cipher-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(79,255,212,0.2);
          background: rgba(79,255,212,0.04);
          color: var(--teal);
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 999px;
        }

        .cipher-tag::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--teal);
          animation: pulseGlow 2s ease-in-out infinite;
        }

        .card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          transition: border-color 0.3s, background 0.3s;
        }

        .card:hover {
          background: rgba(255,255,255,0.03);
          border-color: rgba(79,255,212,0.15);
        }

        .step-line {
          position: absolute;
          left: 19px;
          top: 40px;
          bottom: -40px;
          width: 1px;
          background: linear-gradient(to bottom, rgba(79,255,212,0.3), transparent);
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 28px;
          height: 52px;
          background: var(--teal);
          color: #070B14;
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.04em;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          text-decoration: none;
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .btn-primary:active { transform: scale(0.98); }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 28px;
          height: 52px;
          background: transparent;
          color: rgba(255,255,255,0.5);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
          text-decoration: none;
        }
        .btn-ghost:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.16); }

        .mono { font-family: var(--font-mono); }
        .teal { color: var(--teal); }

        section { position: relative; }
      `}</style>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      {/* ── Nav ── */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          background: 'rgba(7,11,20,0.7)',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 32px',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="rgba(79,255,212,0.1)" />
              <path d="M8 14h4m4 0h4M14 8v4m0 4v4" stroke="#4FFFD4" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="11" y="11" width="6" height="6" rx="1" stroke="#4FFFD4" strokeWidth="1" />
            </svg>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.03em' }}>CipherMarket</span>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: 36 }} className="hidden md:flex">
            {['Technology', 'Security', 'Markets'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.35)',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
              >
                {item}
              </a>
            ))}
          </div>

          <Link href="/dashboard" className="btn-primary" style={{ height: 40, fontSize: 13, padding: '0 20px' }}>
            Launch App
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7h8M7.5 3.5L11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        id="hero"
      >
        {/* Background glows */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div
            className="glow-orb"
            style={{
              position: 'absolute',
              top: '15%',
              left: '10%',
              width: 500,
              height: 500,
              background: 'rgba(79,255,212,0.12)',
              animationDelay: '0s',
            }}
          />
          <div
            className="glow-orb"
            style={{
              position: 'absolute',
              top: '30%',
              right: '5%',
              width: 400,
              height: 400,
              background: 'rgba(59,130,246,0.08)',
              animationDelay: '2.5s',
            }}
          />
          <CipherRain />
        </div>

        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            padding: '160px 32px 100px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 64,
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
          className="grid-cols-1 md:grid-cols-2"
        >
          {/* Left */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="cipher-tag">Live on Ethereum Sepolia · FHE enabled</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{
                marginTop: 28,
                fontSize: 'clamp(42px, 5vw, 72px)',
                fontWeight: 900,
                lineHeight: 1.02,
                letterSpacing: '-0.04em',
              }}
            >
              Predict.<br />
              <span style={{ color: '#4FFFD4' }}>Stay sealed.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{
                marginTop: 24,
                fontSize: 16,
                lineHeight: 1.75,
                color: 'rgba(255,255,255,0.45)',
                maxWidth: 420,
              }}
            >
              The first prediction market where your positions are encrypted end-to-end using Fully Homomorphic Encryption. Place bets without exposing your strategy, wallet, or stake to anyone — on-chain or off.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              style={{ display: 'flex', gap: 12, marginTop: 36, flexWrap: 'wrap' }}
            >
              <Link href="/dashboard" className="btn-primary">
                Open Markets
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <a href="#technology" className="btn-ghost">
                How it works
              </a>
            </motion.div>

            {/* Trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              style={{
                marginTop: 52,
                display: 'flex',
                gap: 28,
                flexWrap: 'wrap',
              }}
            >
              {[
                { label: 'Total markets', val: '127' },
                { label: 'Total volume', val: '$2.4M' },
                { label: 'Avg. encryption time', val: '< 80ms' },
              ].map((s) => (
                <div key={s.label}>
                  <div className="mono" style={{ fontSize: 20, fontWeight: 500, color: '#fff' }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, letterSpacing: '0.08em' }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            <TerminalMockup />

            {/* Market preview card */}
            <div
              className="card"
              style={{ marginTop: 16, padding: '16px 20px' }}
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
                    background: 'rgba(79,255,212,0.1)',
                    color: '#4FFFD4',
                    border: '1px solid rgba(79,255,212,0.2)',
                  }}
                >
                  ACTIVE
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'YES', pool: '68%', color: 'rgba(79,255,212,0.12)', border: 'rgba(79,255,212,0.2)', text: '#4FFFD4' },
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
          </motion.div>
        </div>
      </motion.section>

      {/* ── Ticker ── */}
      <EncryptedTicker />

      {/* ── Stats bar ── */}
      <section style={{ padding: '64px 32px', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div
          style={{
            maxWidth: 900,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 32,
          }}
        >
          {([
            { value: '100%', label: 'Positions encrypted' },
            { value: '0', label: 'Plaintext position leaks' },
            { value: '48h', label: 'Dispute window' },
            { value: 'FHE', label: 'Native computation' },
          ] as StatItem[]).map((s) => (
            <StatBlock key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ── Technology ── */}
      <section id="technology" style={{ padding: '120px 32px' }}>
        {/* Background accent */}
        <div
          className="glow-orb"
          style={{
            position: 'absolute',
            top: '20%',
            right: '-10%',
            width: 600,
            height: 600,
            background: 'rgba(79,255,212,0.05)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 2 }}>
          {/* Section label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 64 }}
          >
            <div className="mono" style={{ fontSize: 11, color: '#4FFFD4', letterSpacing: '0.2em', marginBottom: 16 }}>
              HOW IT WORKS
            </div>
            <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.03em', maxWidth: 560 }}>
              Encrypted from input to settlement.
            </h2>
            <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.4)', fontSize: 15, lineHeight: 1.7, maxWidth: 460 }}>
              FHE lets the smart contract compute on ciphertexts directly — no trusted relay, no off-chain coordinator. Your position stays encrypted throughout its entire lifecycle.
            </p>
          </motion.div>

          {/* Steps */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px 64px' }} className="grid-cols-1 md:grid-cols-2">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                style={{ position: 'relative', paddingLeft: 48 }}
              >
                {/* Number */}
                <div
                  className="mono"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgba(79,255,212,0.08)',
                    border: '1px solid rgba(79,255,212,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#4FFFD4',
                  }}
                >
                  {step.n}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
                  {step.title}
                </h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.75 }}>
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Code block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{
              marginTop: 64,
              borderRadius: 20,
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', gap: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'rgba(239,68,68,0.4)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'rgba(234,179,8,0.4)' }} />
                <div style={{ width: 10, height: 10, borderRadius: 9999, background: 'rgba(79,255,212,0.3)' }} />
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>PredictionMarket.sol · placeBet</span>
              <div />
            </div>
            <pre
              className="mono"
              style={{
                padding: '24px 28px',
                fontSize: 12,
                lineHeight: 1.8,
                overflowX: 'auto',
                background: '#080C14',
                color: 'rgba(255,255,255,0.55)',
              }}
            >{`function placeBet(
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
}`}</pre>
          </motion.div>
        </div>
      </section>

      {/* ── Security section ── */}
      <section
        id="security"
        style={{
          padding: '120px 32px',
          background: 'rgba(79,255,212,0.02)',
          borderTop: '1px solid rgba(79,255,212,0.06)',
          borderBottom: '1px solid rgba(79,255,212,0.06)',
        }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }} className="grid-cols-1 md:grid-cols-2">
            {/* Left */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <div className="mono" style={{ fontSize: 11, color: '#4FFFD4', letterSpacing: '0.2em', marginBottom: 16 }}>
                SECURITY MODEL
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                What even the contract owner can&apos;t see.
              </h2>
              <p style={{ marginTop: 20, fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                FHE ciphertexts are governed by on-chain ACL. No address — not even the deployer — can decrypt your position without an explicit permit signed by your wallet. Access control is enforced at the cryptographic layer, not by trust.
              </p>

              <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  'Individual positions never touch plaintext on-chain',
                  'Aggregate totals visible; per-wallet stakes are not',
                  'Oracle slashing cannot expose position data',
                  'Permit system: you control who can read your stake',
                ].map((point) => (
                  <div key={point} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div
                      style={{
                        flexShrink: 0,
                        marginTop: 3,
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: 'rgba(79,255,212,0.12)',
                        border: '1px solid rgba(79,255,212,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4l2 2 3-3" stroke="#4FFFD4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{point}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right — Access control diagram */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
            >
              {[
                { role: 'Your wallet', can: 'Read own stake (permit required)', cannot: null, highlight: true },
                { role: 'Other users', can: null, cannot: 'Read any position', highlight: false },
                { role: 'Oracle', can: 'Propose outcome', cannot: 'Read positions', highlight: false },
                { role: 'Contract owner', can: 'Resolve disputes', cannot: 'Read positions', highlight: false },
                { role: 'Anyone', can: 'See aggregate pool totals', cannot: null, highlight: false },
              ].map((row) => (
                <div
                  key={row.role}
                  className="card"
                  style={{
                    padding: '14px 18px',
                    borderColor: row.highlight ? 'rgba(79,255,212,0.2)' : undefined,
                    background: row.highlight ? 'rgba(79,255,212,0.04)' : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: row.highlight ? '#4FFFD4' : 'rgba(255,255,255,0.7)', minWidth: 120 }}>
                    {row.role}
                  </span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {row.can && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: 'rgba(79,255,212,0.08)',
                          color: '#4FFFD4',
                          border: '1px solid rgba(79,255,212,0.15)',
                        }}
                      >
                        ✓ {row.can}
                      </span>
                    )}
                    {row.cannot && (
                      <span
                        style={{
                          fontSize: 11,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: 'rgba(239,68,68,0.06)',
                          color: 'rgba(248,113,113,0.7)',
                          border: '1px solid rgba(239,68,68,0.12)',
                        }}
                      >
                        ✗ {row.cannot}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Markets preview ── */}
      <section id="markets" style={{ padding: '120px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}
          >
            <div>
              <div className="mono" style={{ fontSize: 11, color: '#4FFFD4', letterSpacing: '0.2em', marginBottom: 12 }}>LIVE MARKETS</div>
              <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 900, letterSpacing: '-0.03em' }}>
                Everything&apos;s encrypted.<br />Even the stakes.
              </h2>
            </div>
            <Link href="/dashboard" className="btn-ghost">
              View all markets →
            </Link>
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="grid-cols-1 md:grid-cols-3">
            {[
              { title: 'Will ETH break $4K before Q3 2026?', category: 'Crypto', yes: 64, volume: '██████', expires: '42 days' },
              { title: 'Fed rate cut before September 2026?', category: 'Finance', yes: 38, volume: '██████', expires: '108 days' },
              { title: 'Will BTC reach $120K this cycle?', category: 'Crypto', yes: 51, volume: '██████', expires: '180 days' },
            ].map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card"
                style={{ padding: '24px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      padding: '2px 8px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.3)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {m.category}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{m.expires} left</span>
                </div>

                <h3 style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, marginBottom: 20, color: 'rgba(255,255,255,0.85)' }}>
                  {m.title}
                </h3>

                {/* Pool bar */}
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.05)', marginBottom: 8, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${m.yes}%`,
                      height: '100%',
                      background: '#4FFFD4',
                      borderRadius: 999,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: '#4FFFD4', fontWeight: 700 }}>YES {m.yes}%</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>NO {100 - m.yes}%</span>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginBottom: 2 }}>Total volume</div>
                    <div className="mono" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{m.volume}</div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.05em',
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: 'rgba(79,255,212,0.08)',
                      color: '#4FFFD4',
                      border: '1px solid rgba(79,255,212,0.15)',
                    }}
                  >
                    ACTIVE
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '120px 32px 160px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div
          className="glow-orb"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 800,
            height: 400,
            background: 'rgba(79,255,212,0.06)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <div className="mono" style={{ fontSize: 11, color: '#4FFFD4', letterSpacing: '0.2em', marginBottom: 20 }}>
            READY TO TRADE
          </div>
          <h2 style={{ fontSize: 'clamp(36px, 5vw, 72px)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
            Your positions.<br />
            <span style={{ color: '#4FFFD4' }}>Your secret.</span>
          </h2>
          <p style={{ marginTop: 20, fontSize: 16, color: 'rgba(255,255,255,0.35)', maxWidth: 440, margin: '20px auto 0' }}>
            Join the only prediction market where the protocol itself cannot see your strategy.
          </p>
          <div style={{ marginTop: 40, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard" className="btn-primary" style={{ height: 56, fontSize: 16, padding: '0 36px' }}>
              Enter CipherMarket
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9h11M9.5 4.5L14 9l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '40px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          maxWidth: 1200,
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="rgba(79,255,212,0.08)" />
            <path d="M8 14h4m4 0h4M14 8v4m0 4v4" stroke="#4FFFD4" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="11" y="11" width="6" height="6" rx="1" stroke="#4FFFD4" strokeWidth="1" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 800 }}>CipherMarket</span>
          <span className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>v1.0.0-beta</span>
        </div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['GitHub', 'Docs', 'Telegram'].map((link) => (
            <a
              key={link}
              href="#"
              style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', letterSpacing: '0.04em' }}
            >
              {link}
            </a>
          ))}
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
          Built on Fhenix CoFHE · Ethereum Sepolia
        </div>
      </footer>
    </>
  );
}