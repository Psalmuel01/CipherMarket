'use client';

import Link from 'next/link';
import LandingNav from '@/components/layout/LandingNav';
import LandingFooter from '@/components/layout/LandingFooter';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocSection = {
  tag:   string;
  title: string;
  body:  string;
  note?: string;
};

type DocGroup = {
  label:    string;
  sections: DocSection[];
};

// ─── Content ──────────────────────────────────────────────────────────────────
const DOC_GROUPS: DocGroup[] = [
  {
    label: 'The Basics',
    sections: [
      {
        tag:   'Overview',
        title: 'What CipherMarket is',
        body:  'CipherMarket is a share-based prediction market. You buy or sell outcome shares that settle at 1 unit of collateral if correct, and 0 if wrong. The market runs on Ethereum Sepolia using Fully Homomorphic Encryption to keep your positions private.',
      },
      {
        tag:   'Pricing',
        title: 'How prices are determined',
        body:  'Each market uses a Fixed-Product Market Maker (FPMM). Pool reserves, implied probabilities, and trade quotes are all public — this keeps the market readable and lets you review a price before you commit. When you buy shares in one outcome, its price rises and all others fall proportionally.',
      },
      {
        tag:   'Privacy',
        title: 'What stays private',
        body:  'Your cumulative position is encrypted on-chain using FHE. Nobody reading contract storage can determine whether you hold shares, how many you hold, or which outcome you chose. Trade events on-chain do not reveal size, direction, or outcome.',
        note:  'Pool-level data — reserves, total liquidity, probabilities, and lifecycle state — remains public. This is a deliberate tradeoff that keeps quotes honest and FPMM mechanics intact.',
      },
    ],
  },
  {
    label: 'Trading',
    sections: [
      {
        tag:   'Buying',
        title: 'How to buy shares',
        body:  'Select a market, choose an outcome, and enter a collateral amount. The trade panel shows your estimated shares, average price, fee, and how the market probability shifts after your trade. Confirm in your wallet — the pool updates immediately.',
      },
      {
        tag:   'Selling',
        title: 'How to sell shares',
        body:  'Selling requires a two-step flow. First, a decrypt request verifies your private balance with the FHE coprocessor. Once confirmed, you submit the sell transaction against the current pool state. The interface will show a verification step between these two actions — that is expected, not a freeze.',
        note:  'If a market expires between your decrypt request and your sell transaction, the sell will be rejected. Your shares are not lost — they go through the normal redemption path after resolution.',
      },
      {
        tag:   'Quotes',
        title: 'Understanding the quote panel',
        body:  'The quote panel shows: estimated shares out, average price per share, fee amount, and post-trade probabilities. Quotes are based on the current pool state and may shift slightly between estimate and execution. Set a slippage tolerance before confirming.',
      },
    ],
  },
  {
    label: 'Markets',
    sections: [
      {
        tag:   'Creation',
        title: 'Creating a market',
        body:  'A market creator defines the title, description, oracle source, outcome labels, expiry time, collateral type, minimum trade size, and seed liquidity. Seed liquidity is split equally across all outcomes at launch — it must be evenly divisible by the outcome count.',
      },
      {
        tag:   'Lifecycle',
        title: 'Market states',
        body:  'Every market passes through explicit states. ACTIVE means trading is open. EXPIRED means the expiry time has passed and trading is closed. PROPOSED means an oracle has submitted an outcome. DISPUTED means a challenge has been raised. FINALIZED means the outcome is locked and redemptions are open.',
      },
      {
        tag:   'Expiry',
        title: 'What happens at expiry',
        body:  'When a market reaches its expiry time, trading stops automatically. No further buys or sells are accepted. The market waits for an oracle to propose the outcome. If no oracle proposes within a reasonable period, positions remain in place until resolution occurs.',
        note:  'Shares cannot be sold after expiry. If you hold a position in an expired market, wait for resolution and redeem through the finalized market page.',
      },
    ],
  },
  {
    label: 'Resolution',
    sections: [
      {
        tag:   'Oracle',
        title: 'How a market resolves',
        body:  'A registered oracle reviews the oracle source listed on the market and submits the outcome they believe is correct. This opens a fixed dispute window. If nobody disputes before the window closes, the proposal finalizes automatically.',
      },
      {
        tag:   'Disputes',
        title: 'Disputing a result',
        body:  'Anyone can dispute a proposed outcome by staking collateral during the dispute window. If the dispute succeeds and the oracle is overturned, disputers receive their stake back. If the dispute fails and the original proposal is upheld, the dispute stake is not refunded — it goes to the protocol.',
        note:  'Disputing has a real cost if you are wrong. Review the oracle source carefully before challenging.',
      },
      {
        tag:   'Finalization',
        title: 'After a market finalizes',
        body:  'Once finalized, the winning outcome is locked permanently. Winning shares redeem 1:1 against the market collateral. Losing shares are worth zero. The LP creator can claim any surplus collateral after all winners have redeemed.',
      },
    ],
  },
  {
    label: 'Oracles',
    sections: [
      {
        tag:   'Registration',
        title: 'Becoming an oracle',
        body:  'Go to the Oracle page and register by locking the minimum ETH stake. Once registered, you can propose outcomes on expired markets. Your stake is at risk if a disputed proposal is overturned by the protocol.',
      },
      {
        tag:   'Slashing',
        title: 'Oracle accountability',
        body:  'If you propose an outcome that is disputed and overturned, a portion of your staked ETH can be slashed and sent to the protocol. You cannot deregister as an oracle while a proposal you made is still under dispute. Registration unlocks after the market finalizes.',
      },
    ],
  },
  {
    label: 'Redemption',
    sections: [
      {
        tag:   'Claiming',
        title: 'Redeeming winning shares',
        body:  'After finalization, go to the market page and start the redemption flow. Like selling, redemption requires a decrypt step to verify your private winning balance. Once verified, submit the claim transaction to receive your collateral.',
      },
      {
        tag:   'Timing',
        title: 'When to expect delays',
        body:  'Secure computation adds latency to any flow that touches your private balance: selling, redeeming, and viewing your portfolio. When the interface shows a verification or decryption state, it is waiting for the FHE coprocessor to confirm your balance. This typically resolves within a few seconds to a minute depending on network conditions.',
      },
    ],
  },
];

// ─── Anchor helper ────────────────────────────────────────────────────────────
function toAnchor(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-[#000000] text-[#e8e4df] antialiased overflow-x-hidden font-sans">
      {/* Noise overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Accent glows */}
      <div
        className="pointer-events-none fixed -top-40 -left-20 w-[600px] h-[600px] rounded-full z-0"
        style={{ background: 'radial-gradient(circle, rgba(232,83,58,0.07) 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none fixed top-1/4 -right-20 w-[500px] h-[500px] rounded-full z-0"
        style={{ background: 'radial-gradient(circle, rgba(232,83,58,0.04) 0%, transparent 70%)' }}
      />

      <LandingNav />

      {/* ── HERO ── */}
      <header className="relative z-10 border-b border-white/[0.07] bg-white/[0.01]">
        <div className="mx-auto max-w-6xl px-6 lg:px-10 py-20 lg:py-24">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="max-w-[640px]">
              <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
                Documentation · v1.0
              </div>
              <h1 className="text-[48px] lg:text-[64px] leading-[0.95] tracking-[-0.04em] mb-6">
                <span className="font-serif italic text-[#e8e4df]">How it</span>
                <br />
                <span className="font-sans font-light text-white/35">works.</span>
              </h1>
              <p className="text-[16px] leading-[1.85] text-white/45 font-light">
                CipherMarket is designed to behave like a standard prediction market at the pool level
                and a private system at the position level. This guide explains the core mechanics
                and cryptographic tradeoffs.
              </p>
            </div>

            {/* Quick Stats/Links */}
            <div className="flex flex-col gap-3 min-w-[200px]">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/20 mb-1">On this page</p>
              {DOC_GROUPS.map((group) => (
                <Link
                  key={group.label}
                  href={`#${toAnchor(group.label)}`}
                  className="font-mono text-[11px] text-white/40 hover:text-[#e8533a] transition-colors flex items-center gap-2 group"
                >
                  <span className="w-1 h-1 rounded-full bg-white/10 group-hover:bg-[#e8533a] transition-colors" />
                  {group.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="relative z-10 mx-auto max-w-6xl px-6 lg:px-10 py-16 lg:py-24">
        <div className="grid lg:grid-cols-[240px_1fr] gap-16 lg:gap-24 items-start">
          
          {/* Sidebar Navigation */}
          <aside className="sticky top-32 hidden lg:block">
            <div className="flex flex-col gap-10">
              {DOC_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/20 mb-4">{group.label}</p>
                  <nav className="flex flex-col gap-2">
                    {group.sections.map((section) => (
                      <Link
                        key={section.title}
                        href={`#${toAnchor(group.label)}`}
                        className="text-[13px] text-white/40 hover:text-white/80 transition-colors py-1"
                      >
                        {section.tag}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="flex flex-col gap-24">
            {DOC_GROUPS.map((group) => (
              <section
                key={group.label}
                id={toAnchor(group.label)}
                className="scroll-mt-32"
              >
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="font-serif italic text-[32px] text-[#e8e4df] tracking-[-0.02em]">
                    {group.label}
                  </h2>
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-white/[0.08] to-transparent" />
                </div>

                <div className="grid gap-6">
                  {group.sections.map((section) => (
                    <article
                      key={section.title}
                      className="group rounded-[24px] border border-white/[0.07] bg-white/[0.02] p-8 hover:border-white/[0.12] hover:bg-white/[0.035] transition-all relative overflow-hidden"
                    >
                      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#e8533a]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="flex items-start justify-between mb-6">
                        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-3 py-1">
                          {section.tag}
                        </span>
                      </div>

                      <h3 className="font-serif italic text-[22px] text-[#e8e4df] leading-[1.2] tracking-[-0.01em] mb-4">
                        {section.title}
                      </h3>
                      
                      <p className="text-[14px] leading-[1.8] text-white/45 font-light max-w-[640px]">
                        {section.body}
                      </p>

                      {section.note && (
                        <div className="mt-6 flex gap-3 p-4 rounded-xl bg-[#e8533a]/5 border border-[#e8533a]/10 text-[12px] leading-[1.6] text-[#e8533a]/80 font-mono">
                          <span className="shrink-0">→</span>
                          <p>{section.note}</p>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <LandingFooter />
    </main>
  );
}
