'use client';

import Link from 'next/link';
import LandingNav from '@/components/layout/LandingNav';
import LandingFooter from '@/components/layout/LandingFooter';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
type DocSection = {
  tag: string;
  title: string;
  body: string;
  note?: string;
};

type DocGroup = {
  label: string;
  sections: DocSection[];
};

// ─── Content ──────────────────────────────────────────────────────────────────
const DOC_GROUPS: DocGroup[] = [
  {
    label: 'The Basics',
    sections: [
      {
        tag: 'Overview',
        title: 'What CipherMarket is',
        body: 'CipherMarket is a share-based prediction market on Arbitrum Sepolia. You buy or sell outcome shares that settle at 1 unit of the market collateral if correct, and 0 if wrong. Fully Homomorphic Encryption keeps individual positions private while pool odds remain public.',
      },
      {
        tag: 'Pricing',
        title: 'How prices are determined',
        body: 'Each market uses a Fixed-Product Market Maker (FPMM). Pool reserves, implied probabilities, and trade quotes are all public — this keeps the market readable and lets you review a price before you commit. When you buy shares in one outcome, its price rises and all others fall proportionally.',
      },
      {
        tag: 'Privacy',
        title: 'What stays private',
        body: 'Your cumulative position is encrypted on-chain using FHE. Nobody reading contract storage can determine whether you hold shares, how many you hold, or which outcome you chose. Trade events on-chain do not reveal size, direction, or outcome.',
        note: 'Pool-level data — reserves, total liquidity, probabilities, and lifecycle state — remains public. This is a deliberate tradeoff that keeps quotes honest and FPMM mechanics intact.',
      },
      {
        tag: 'Social',
        title: 'Market discussions',
        body: 'Markets include Supabase-backed discussion and lightweight reactions so traders can reason about sources, outcomes, and disputes inside the product. These social features are app-level data and do not affect the on-chain market state.',
      },
    ],
  },
  {
    label: 'Trading',
    sections: [
      {
        tag: 'Buying',
        title: 'How to buy shares',
        body: 'Select a market, choose an outcome, and enter a collateral amount. The trade panel shows your estimated shares, average price, fee, and how the market probability shifts after your trade. Confirm in your wallet — the pool updates immediately.',
      },
      {
        tag: 'Selling',
        title: 'How to sell shares',
        body: 'Selling requires a secure balance check. The app authorizes the encrypted handle through CoFHE, requests a decrypt-for-transaction result, and submits the sell transaction with a verifiable signature. The contract verifies that result before reducing the encrypted balance.',
        note: 'If a market expires between your decrypt request and your sell transaction, the sell will be rejected. Your shares are not lost — they go through the normal redemption path after resolution.',
      },
      {
        tag: 'Quotes',
        title: 'Understanding the quote panel',
        body: 'The quote panel shows: estimated shares out, average price per share, fee amount, and post-trade probabilities. Quotes are based on the current pool state and may shift slightly between estimate and execution. Set a slippage tolerance before confirming.',
      },
      {
        tag: 'Accounting',
        title: 'Invested amount vs share value',
        body: 'The app tracks how much collateral you contributed per outcome, not just the current face value of your shares. If you buy 5 USDC of an outcome and later hold 20 winning shares, the portfolio can show that you invested 5 USDC and now have 20 USDC claimable. If you sell shares, the invested amount is reduced proportionally.',
      },
    ],
  },
  {
    label: 'Markets',
    sections: [
      {
        tag: 'Creation',
        title: 'Creating a market',
        body: 'A market creator defines the title, description, oracle source, outcome labels, expiry time, collateral type, minimum trade size, and seed liquidity. Seed liquidity is split equally across all outcomes at launch — it must be evenly divisible by the outcome count.',
      },
      {
        tag: 'Lifecycle',
        title: 'Market states',
        body: 'Every market passes through explicit states. ACTIVE means trading is open. EXPIRED now appears in the interface as Awaiting Resolution: trading is closed and an oracle can propose an outcome. RESOLUTION_OPEN appears as In Resolution: committee voting and disputes are open. ESCALATED appears as Admin Review: quorum failed or votes tied. FINALIZED appears as Resolved: the winning outcome is locked and claims are open.',
      },
      {
        tag: 'Expiry',
        title: 'What happens at expiry',
        body: 'When a market reaches its expiry time, trading stops automatically. No further buys or sells are accepted. The market waits for an oracle to propose the outcome. If no oracle proposes within a reasonable period, positions remain in place until resolution occurs.',
        note: 'Shares cannot be sold after expiry. If you hold a position in an expired market, wait for resolution and redeem through the finalized market page.',
      },
    ],
  },
  {
    label: 'Resolution',
    sections: [
      {
        tag: 'Oracle',
        title: 'How a market resolves',
        body: 'A registered oracle reviews the oracle source listed on the market and submits an initial outcome after expiry. This opens the resolution window. For testnet deployments the window is intentionally short, currently 5 minutes, so you can propose and then finalize quickly if nobody disputes.',
      },
      {
        tag: 'Disputes',
        title: 'Disputing a result',
        body: 'Anyone can dispute a proposed outcome by staking collateral against an explicit counter-outcome during the resolution window. A dispute activates committee voting. If the committee resolves against the original proposal, the disputer can reclaim their stake. If the committee upholds the proposal, the dispute stake is forfeited and split across protocol-defined reward paths.',
        note: 'Disputing has a real cost if you are wrong. Review the oracle source carefully before challenging.',
      },
      {
        tag: 'Reineira',
        title: 'Confidential dispute escrow',
        body: 'USDC dispute bonds can be routed through Reineira escrow. Users start with regular USDC, Reineira wraps it into encrypted cUSDC internally, and settlement unwraps back into USDC before the adapter refunds the disputer or forwards the stake to the market.',
        note: 'ETH markets use the direct custody dispute path because the Reineira escrow integration is designed around USDC/cUSDC.',
      },
      {
        tag: 'Finalization',
        title: 'After a market finalizes',
        body: 'If no dispute is opened, the proposed outcome can be finalized directly after the resolution window. If a dispute is opened, registered oracles vote with stake-weighted ETH power and the market finalizes by quorum. Once finalized, the winning outcome is locked permanently. Winning shares redeem 1:1 against the market collateral.',
      },
      {
        tag: 'Escalation',
        title: 'When committee voting cannot decide',
        body: 'If the resolution window ends without quorum, or if vote weight is tied or fragmented, anyone can escalate the market. On the current test configuration the escalation timeout is 10 minutes. After escalation, the contract owner can resolve through the fallback path.',
      },
    ],
  },
  {
    label: 'Oracles',
    sections: [
      {
        tag: 'Registration',
        title: 'Becoming an oracle',
        body: 'Go to the Oracle page and register by locking the minimum ETH stake. The current minimum is 1 ETH. Once registered, you can propose outcomes on expired markets and vote during resolution windows. Your stake is reused across markets; you do not spend 1 ETH per proposal.',
      },
      {
        tag: 'Voting',
        title: 'How oracle voting weight works',
        body: 'Oracle voting is weighted in staked ETH, not in the market collateral. If you have 1 ETH staked, your vote contributes 1 ETH of vote weight on each market you vote on. If another oracle has 3 ETH staked, their vote contributes 3 ETH. The vote weight is snapshotted when the vote is cast.',
        note: 'Market collateral can be ETH or USDC, but oracle voting power is always based on oracle registry stake in ETH.',
      },
      {
        tag: 'Slashing',
        title: 'Oracle accountability',
        body: 'If you propose an outcome that is disputed and overturned, a portion of your staked ETH can be slashed and sent to the protocol. You cannot deregister while any proposal you made is still unresolved. Each proposal adds a lock, and each finalized market removes that lock.',
      },
    ],
  },
  {
    label: 'Redemption',
    sections: [
      {
        tag: 'Claiming',
        title: 'Redeeming winning shares',
        body: 'After finalization, reveal your values on the market page, then start the redemption flow. Like selling, redemption authorizes the encrypted winning-position handle, requests a CoFHE decrypt-for-transaction result, and submits the claim transaction with a signature the contract verifies.',
        note: 'If values are hidden, the redeem button stays disabled because the app cannot safely confirm that this wallet has winning shares.',
      },
      {
        tag: 'History',
        title: 'Settled portfolio history',
        body: 'The portfolio separates claimable winning shares, redeemed payout, non-winning shares, remaining invested amount, and net after cost. This avoids the misleading case where a user redeemed a winning position but still holds losing shares from the same finalized market.',
      },
      {
        tag: 'Timing',
        title: 'When to expect delays',
        body: 'Secure computation adds latency to any flow that touches your private balance: selling, redeeming, and viewing your portfolio. When the interface shows a verification or decryption state, it is waiting for the FHE coprocessor to confirm your balance. This typically resolves within a few seconds to a minute depending on network conditions.',
      },
    ],
  },
  {
    label: 'Analytics',
    sections: [
      {
        tag: 'Liquidity',
        title: 'Sealed liquidity',
        body: 'Sealed liquidity is a current TVL snapshot: the collateral still locked across markets. It changes when collateral enters or exits through trades, redemption, LP claims, or protocol accounting.',
      },
      {
        tag: 'Volume',
        title: 'Aggregate volume',
        body: 'Aggregate volume is cumulative trade flow. It increases on buys and sells and does not decrease when collateral leaves. Liquidity and volume can match early in a market, but they are different metrics and should diverge over time.',
      },
      {
        tag: 'Currencies',
        title: 'Mixed collateral totals',
        body: 'Because markets can use ETH or USDC, dashboard totals are grouped by collateral instead of being forced into one unit. Compact values such as 15 USDC · 1 ETH keep the stats readable without hiding currency differences.',
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
    <div className="relative z-10 font-sans mx-auto max-w-[80%] px-8 lg:px-16 ">

      {/* ── HERO ── */}
      <header className="relative z-10 border-b border-white/[0.07] bg-white/[0.01]">
        <div className="py-14 lg:pt-20">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10">
            <div className="mt-5 max-w-[640px">
              {/* <div className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.25em] text-[#e8533a] bg-[#e8533a]/10 border border-[#e8533a]/20 rounded-full px-4 py-2 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#e8533a]" />
                Documentation · v1.0
              </div> */}
              <h1 className="text-[38px] lg:text-[48px] leading-[0.95] tracking-[-0.04em] mb-6">
                <span className="font-serif italic text-[#e8e4df]">How it</span>
                {/* <br /> */}
                <span className="ml-5 font-sans font-light text-white/35">works.</span>
              </h1>
              <p className="text-[16px] leading-[1.85] text-white/45 font-light">
                CipherMarket is designed to behave like a standard prediction market at the pool level
                and a private system at the position level. This guide explains the core mechanics
                and cryptographic tradeoffs.
              </p>
            </div>

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
      <div className="relative z-10 mx-auto py-12 lg:py-16">
        <div className="grid lg:grid-cols-[240px_1fr] gap-16 lg:gap-24 items-start">

          {/* Sidebar Navigation */}
          <aside className="sticky top-32 hidden lg:block">
            <div className="flex flex-col gap-10">
              {DOC_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="font-mono font-semibold text-sm uppercase tracking-[0.2em] text-white/20 mb-4">{group.label}</p>
                  <nav className="flex flex-col gap-2">
                    {group.sections.map((section) => (
                      <Link
                        key={section.title}
                        href={`#${toAnchor(group.label)}`}
                        className="text-[13px] text-white/40 font-medium hover:text-white/80 transition-colors py-1"
                      >
                        {section.tag}
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
              <div>
                <p className="font-mono font-semibold text-sm uppercase tracking-[0.2em] text-white/20 mb-4">Developers</p>
                <nav className="flex flex-col gap-2">
                  <Link
                    href="/docs/sdk"
                    className="text-[13px] text-white/40 font-medium hover:text-white/80 transition-colors py-1"
                  >
                    SDK
                  </Link>
                </nav>
              </div>
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

    </div>
  );
}
