'use client';

import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import useOracleStatus from '@/hooks/useOracleStatus';
import ProposeOutcomeForm from '@/components/oracle/ProposeOutcomeForm';

export interface OracleDashboardProps {
  className?: string;
}

export default function OracleDashboard({ className }: OracleDashboardProps): JSX.Element {
  const { data, error, isError, isLoading } = useOracleStatus();

  return (
    <section className={className}>
      <div className="grid gap-5 xl:grid-cols-[1.3fr,0.9fr]">
        <div className="rounded-2xl border border-line bg-panel/72 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal">
                Oracle Registry
              </p>
              <h2 className="mt-2 text-xl text-text">Stake-backed resolution desk</h2>
            </div>
            <Button type="button" variant="ghost">
              Register
            </Button>
          </div>

          {isLoading ? <Skeleton className="mt-6 h-32 w-full" /> : null}
          {isError && error ? <p className="mt-6 text-sm text-danger">{error.message}</p> : null}

          {data ? (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-surface/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Stake</p>
                <p className="mt-2 font-mono text-xl text-text">{data.stakeFormatted}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Exposure</p>
                <p className="mt-2 font-mono text-xl text-text">{data.disputeExposure}</p>
              </div>
              <div className="rounded-2xl border border-line bg-surface/70 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">Assignments</p>
                <p className="mt-2 font-mono text-xl text-text">{data.activeAssignments}</p>
              </div>
            </div>
          ) : null}
        </div>

        <ProposeOutcomeForm />
      </div>
    </section>
  );
}

