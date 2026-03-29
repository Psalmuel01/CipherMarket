'use client';

import { ShieldCheck, Activity, Target, Zap, ChevronRight, Gavel } from 'lucide-react';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useOracleStatus from '@/hooks/useOracleStatus';
import ProposeOutcomeForm from '@/components/oracle/ProposeOutcomeForm';
import clsx from 'clsx';
import useRegisterOracle from '@/hooks/useRegisterOracle';
import useMarkets from '@/hooks/useMarkets';

export interface OracleDashboardProps {
  className?: string;
}

export default function OracleDashboard({ className }: OracleDashboardProps): JSX.Element {
  const { data, error, isError, isLoading } = useOracleStatus();
  const {
    registerOracle,
    error: registerError,
    isError: isRegisterError,
    isLoading: isRegisterLoading,
  } = useRegisterOracle();
  const { data: markets } = useMarkets();
  const pendingMarkets = markets.filter(
    (market) => market.status === 'EXPIRED' || market.status === 'PROPOSED' || market.status === 'DISPUTED',
  );

  return (
    <section className={clsx("space-y-8", className)}>
      <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
        <div className="space-y-8">
          {/* Main Registry Card */}
          <div className="glass-card rounded-3xl p-8 space-y-8">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    {data?.isRegistered ? 'Oracle Node Active' : 'Oracle Seat Available'}
                  </span>
                </div>
                <h2 className="text-3xl font-black tracking-tight text-foreground">Resolution Desk</h2>
                <p className="text-sm text-muted-foreground">Manage your locked stake and participate in optimistic market resolution.</p>
              </div>
              <Button
                variant="primary"
                className="gap-2"
                disabled={isRegisterLoading || data?.isRegistered}
                onClick={() => registerOracle()}
                type="button"
              >
                <Zap className="h-4 w-4" />
                {data?.isRegistered ? 'Registered' : isRegisterLoading ? 'Registering...' : 'Register Oracle'}
              </Button>
            </div>

            {isLoading ? <Skeleton className="h-40 w-full rounded-2xl" /> : null}
            {isError && error ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive">
                {error.message}
              </div>
            ) : null}

            {data ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white/[0.03] p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 text-primary" />
                    <span>Total Stake</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{data.stakeFormatted}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Minimum: {data.minimumStakeFormatted}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Gavel className="h-3 w-3 text-primary" />
                    <span>Active Disputes</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{data.disputeExposure}</p>
                </div>
                <div className="rounded-2xl bg-white/[0.03] p-6 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <Target className="h-3 w-3 text-primary" />
                    <span>Assignments</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{data.activeAssignments}</p>
                </div>
              </div>
            ) : null}

            {isRegisterError && registerError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-xs font-bold text-destructive">
                {registerError.message}
              </div>
            ) : null}
          </div>

          {/* Pending Resolutions Section Mock */}
          <div className="glass-card rounded-3xl p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest">Awaiting Resolution</h3>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground tracking-widest">
                {pendingMarkets.length} Markets Found
              </span>
            </div>

            <div className="space-y-3">
              {pendingMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4 transition-all hover:bg-white/[0.03]"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Market #{market.marketId}</p>
                    <p className="text-xs text-muted-foreground">{market.title}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    {market.status === 'EXPIRED' ? 'Propose' : 'Review'}
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {pendingMarkets.length === 0 ? (
                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-xs font-bold text-muted-foreground">
                  No markets are currently waiting on oracle action.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside>
          <ProposeOutcomeForm />
        </aside>
      </div>
    </section>
  );
}
