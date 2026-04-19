'use client';

import { Ticket, Activity, History, ArrowUpRight, Trophy, CheckCircle2 } from 'lucide-react';
import TopBar from '@/components/layout/TopBar';
import Button from '@/components/ui/Button';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import clsx from 'clsx';
import Link from 'next/link';

export default function MyBetsPage(): JSX.Element {
  const { hasPlacedBet, lastBetAmount, lastBetOutcome, hasResolved, hasClaimed } = useDemoFlow();

  const mockHistoricalBets = [
    {
      id: '1',
      market: 'Will BTC hit $100k in 2025?',
      outcome: 'YES',
      amount: '1,200',
      payout: '2,840',
      status: 'RESOLVED',
      result: 'WON',
      date: '2026-02-15',
    },
    {
      id: '2',
      market: 'Layer 2 TVL > $50B by Q3?',
      outcome: 'NO',
      amount: '450',
      payout: '0',
      status: 'RESOLVED',
      result: 'LOST',
      date: '2026-01-10',
    },
  ];

  return (
    <>
      <TopBar eyebrow="Private Portfolio" title="My Positions" />
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 lg:px-10">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { label: 'Active Stakes', value: hasPlacedBet ? '1' : '0', icon: Activity, color: 'text-primary' },
            { label: 'Total Payouts', value: '2.84 ETH', icon: Trophy, color: 'text-yellow-400' },
            { label: 'Win Rate', value: '50%', icon: ArrowUpRight, color: 'text-blue-400' },
          ].map((stat) => (
            <div key={stat.label} className="glass-card flex items-center gap-4 rounded-3xl p-6">
              <div className={clsx('rounded-2xl bg-white/5 p-3', stat.color)}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {stat.label}
                </p>
                <p className="font-mono text-2xl font-semibold text-foreground">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
              Active Positions
            </h2>
          </div>

          {!hasPlacedBet ? (
            <div className="glass-card space-y-3 rounded-3xl p-12 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-white/5 p-4 text-muted-foreground">
                  <Ticket className="h-8 w-8" />
                </div>
              </div>
              <p className="mx-auto max-w-xs text-muted-foreground">
                No live positions yet. Open the market desk when you&apos;re ready to put on a view.
              </p>
              <Link href="/dashboard">
                <Button variant="outline" className="mt-4">
                  Explore Markets
                </Button>
              </Link>
            </div>
          ) : (
            <div className="glass-card overflow-hidden rounded-3xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      {['Market', 'Outcome', 'Staked', 'Potential', 'Status', 'Action'].map((label) => (
                        <th
                          key={label}
                          className={clsx(
                            'px-6 py-4 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground',
                            label === 'Action' && 'text-right',
                          )}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5 transition-colors hover:bg-white/[0.01]">
                      <td className="px-6 py-6 font-medium text-foreground">
                        Will ETH settle above $4,000 by June 30?
                      </td>
                      <td className="px-6 py-6">
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                          {lastBetOutcome}
                        </span>
                      </td>
                      <td className="px-6 py-6 font-mono font-semibold text-foreground">
                        {lastBetAmount} ETH
                      </td>
                      <td className="px-6 py-6 font-mono font-semibold text-primary">
                        {(Number(lastBetAmount) * 1.85).toFixed(2)} ETH
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div
                            className={clsx(
                              'h-1.5 w-1.5 rounded-full animate-pulse',
                              hasResolved ? 'bg-yellow-400' : 'bg-primary',
                            )}
                          />
                          <span
                            className={clsx(
                              'font-mono text-[10px] uppercase tracking-[0.18em]',
                              hasResolved ? 'text-yellow-400' : 'text-primary',
                            )}
                          >
                            {hasResolved ? 'Awaiting Payout' : 'Live'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <Link href="/markets/0">
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

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
              Historical Settlements
            </h2>
          </div>

          <div className="grid gap-4">
            {mockHistoricalBets.map((bet) => (
              <div
                key={bet.id}
                className="glass-card flex flex-col justify-between gap-6 rounded-3xl p-6 transition-all hover:border-white/10 md:flex-row md:items-center"
              >
                <div className="space-y-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {bet.date}
                  </p>
                  <p className="text-lg font-semibold text-foreground">{bet.market}</p>
                </div>

                <div className="flex items-center gap-8 text-center">
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Your Side
                    </p>
                    <p className="text-sm font-medium text-foreground">{bet.outcome}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Result
                    </p>
                    <p
                      className={clsx(
                        'font-mono text-sm uppercase tracking-[0.18em]',
                        bet.result === 'WON' ? 'text-primary' : 'text-destructive',
                      )}
                    >
                      {bet.result}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Payout
                    </p>
                    <p className="font-mono text-sm font-semibold text-foreground">{bet.payout} ETH</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap">
                    Archive receipt: 0x{Math.random().toString(16).slice(2, 6)}...
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
