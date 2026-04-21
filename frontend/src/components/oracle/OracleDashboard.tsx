'use client';

import { useState } from 'react';
import { ShieldCheck, Activity, Target, Zap, ChevronRight, Gavel, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import useOracleStatus from '@/hooks/useOracleStatus';
import ProposeOutcomeForm from '@/components/oracle/ProposeOutcomeForm';
import clsx from 'clsx';
import useRegisterOracle from '@/hooks/useRegisterOracle';
import useMarkets from '@/hooks/useMarkets';
import Link from 'next/link';
import { formatEther } from 'viem';
import { DEFAULT_ORACLE_STAKE } from '@/lib/contracts';

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

  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const stakeDisplay = formatEther(DEFAULT_ORACLE_STAKE);
  const minimumStakeDisplay = data?.minimumStakeFormatted ?? `${stakeDisplay} ETH`;

  const handleConfirmRegister = async (): Promise<void> => {
    setShowRegisterModal(false);
    await registerOracle();
  };

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
                {/* <h2 className="text-3xl font-black tracking-tight text-foreground">Resolution</h2> */}
                <h1 className="text-[30px] lg:text-[40px] leading-[1.1] tracking-[-0.04em] mb-4">
                  <span className="font-serif italic text-[#e8e4df]">Oracle</span>
                  {/* <br /> */}
                  <span className="font-sans font-light text-white/35 ml-2">governance.</span>
                </h1>
                <p className="text-sm text-muted-foreground">Manage your locked stake and participate in optimistic market resolution.</p>
              </div>
              <Button
                variant="primary"
                className="gap-2"
                disabled={isRegisterLoading || data?.isRegistered}
                onClick={() => setShowRegisterModal(true)}
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
                    <span>Proposal Locks</span>
                  </div>
                  <p className="text-2xl font-black text-foreground">{data.proposalLocks}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Active assignments: {data.activeAssignments}
                  </p>
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
              <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-xs leading-relaxed text-muted-foreground">
                Becoming an oracle is straightforward: stake at least the registry minimum, wait
                for markets to expire, then propose the outcome backed by the listed source. If a
                disputed proposal is overturned, your stake can be slashed.
              </div>

              {pendingMarkets.map((market) => (
                <div
                  key={market.marketId}
                  className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4 transition-all hover:bg-white/[0.03]"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">Market #{market.marketId}</p>
                    <p className="text-xs text-muted-foreground">{market.title}</p>
                    <p className="text-[11px] text-muted-foreground/80">{market.oracleSource}</p>
                  </div>
                  <Link href={`/markets/${market.marketId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      {market.status === 'EXPIRED' ? 'Propose' : 'Review'}
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
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

      {/* Register Oracle Confirmation Modal */}
      <Modal
        open={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register as Oracle"
        description="Review the details below before staking."
      >
        <div className="space-y-6 py-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6 space-y-3">
            <div className="flex items-start gap-3 rounded-xl bg-amber-500/8 border border-amber-500/15 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Staking Required</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Registering as an oracle requires locking ETH as collateral.
                  This stake can be slashed if your proposals are successfully disputed.
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/5">
              <div className="flex items-center justify-between py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Stake amount</span>
                <span className="font-mono text-lg font-bold text-foreground">{stakeDisplay} ETH</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Registry minimum</span>
                <span className="font-mono text-sm text-muted-foreground">{minimumStakeDisplay}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Role</span>
                <span className="text-sm text-foreground">Optimistic Oracle Node</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Slashing risk</span>
                <span className="text-sm text-amber-400">Yes — if disputed and overturned</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-xs leading-relaxed text-muted-foreground">
            By registering, you agree to propose truthful outcomes backed by the designated oracle source.
            Your stake remains locked while you are an active oracle and may be partially or fully slashed
            in the event of a successful dispute against your proposal.
          </div>

          <div className="flex items-center gap-4 border-t border-white/5 pt-4">
            <Button
              className="flex-1"
              variant="outline"
              size="lg"
              onClick={() => setShowRegisterModal(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              size="lg"
              onClick={() => void handleConfirmRegister()}
              type="button"
            >
              <Zap className="h-4 w-4" />
              Confirm & Stake {stakeDisplay} ETH
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
