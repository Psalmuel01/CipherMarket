'use client';

import { motion } from 'framer-motion';
import { Ticket, Activity, History, ArrowUpRight, Trophy, Clock, CheckCircle2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Button from '@/components/ui/Button';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import clsx from 'clsx';
import Link from 'next/link';

export default function MyBetsPage(): JSX.Element {
  const { hasPlacedBet, lastBetAmount, lastBetOutcome, hasResolved, hasClaimed } = useDemoFlow();

  const MOCK_HISTORICAL_BETS = [
    {
      id: '1',
      market: 'Will BTC hit $100k in 2025?',
      outcome: 'YES',
      amount: '1,200',
      payout: '2,840',
      status: 'RESOLVED',
      result: 'WON',
      date: '2026-02-15'
    },
    {
      id: '2',
      market: 'Layer 2 TVL > $50B by Q3?',
      outcome: 'NO',
      amount: '450',
      payout: '0',
      status: 'RESOLVED',
      result: 'LOST',
      date: '2026-01-10'
    }
  ];

  return (
    <>
      <TopBar eyebrow="Personal Portfolio" title="My Positions" />
      <main className="space-y-10 px-4 py-8 lg:px-10 max-w-7xl mx-auto">
        
        {/* Stats Overview */}
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: 'Active Stakes', value: hasPlacedBet ? '1' : '0', icon: Activity, color: 'text-primary' },
            { label: 'Total Payouts', value: '2.84 ETH', icon: Trophy, color: 'text-yellow-400' },
            { label: 'Win Rate', value: '50%', icon: ArrowUpRight, color: 'text-blue-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-3xl p-6 flex items-center gap-4">
              <div className={clsx("rounded-2xl p-3 bg-white/5", stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Active Bets Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Active Positions</h2>
          </div>

          {!hasPlacedBet ? (
            <div className="glass-card rounded-3xl p-12 text-center space-y-4">
              <div className="flex justify-center">
                <div className="rounded-full bg-white/5 p-4 text-muted-foreground">
                  <Ticket className="h-8 w-8" />
                </div>
              </div>
              <p className="text-muted-foreground max-w-xs mx-auto">You don't have any active positions. Start by exploring the markets.</p>
              <Link href="/">
                <Button variant="outline" className="mt-4">Explore Markets</Button>
              </Link>
            </div>
          ) : (
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Market</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outcome</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Staked</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Potential</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.01]">
                      <td className="px-6 py-6 font-bold text-foreground">Will ETH settle above $4,000 by June 30?</td>
                      <td className="px-6 py-6">
                        <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary border border-primary/20">
                          {lastBetOutcome}
                        </span>
                      </td>
                      <td className="px-6 py-6 font-bold text-foreground">{lastBetAmount} ETH</td>
                      <td className="px-6 py-6 font-bold text-primary">{(Number(lastBetAmount) * 1.85).toFixed(2)} ETH</td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className={clsx("h-1.5 w-1.5 rounded-full animate-pulse", hasResolved ? "bg-yellow-400" : "bg-primary")} />
                          <span className={clsx("text-[10px] font-black uppercase tracking-widest", hasResolved ? "text-yellow-400" : "text-primary")}>
                            {hasResolved ? 'Awaiting Payout' : 'Live'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Link href="/markets/0x5f2d3d4f7f6b4c44f87c7250c6fe2f2606570a11">
                          <Button size="sm" variant="outline" className="gap-2">
                            {hasResolved && !hasClaimed ? 'Claim Wins' : 'View Details'}
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Historical Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Historical Settlements</h2>
          </div>

          <div className="grid gap-4">
            {MOCK_HISTORICAL_BETS.map((bet) => (
              <div key={bet.id} className="glass-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:border-white/10">
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">{bet.date}</p>
                  <p className="text-lg font-black text-foreground">{bet.market}</p>
                </div>
                
                <div className="flex items-center gap-8 text-center">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Your Side</p>
                    <p className="text-sm font-bold text-foreground">{bet.outcome}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Result</p>
                    <p className={clsx("text-sm font-black uppercase tracking-widest", bet.result === 'WON' ? 'text-primary' : 'text-destructive')}>
                      {bet.result}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Payout</p>
                    <p className="text-sm font-black text-foreground">{bet.payout} ETH</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground whitespace-nowrap">Archives: 0x{Math.random().toString(16).slice(2, 6)}...</span>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>
    </>
  );
}
