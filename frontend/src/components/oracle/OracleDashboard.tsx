'use client';

import { useState } from 'react';
import { ShieldCheck, Activity, Target, Zap, ChevronRight, Gavel, AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Skeleton from '@/components/ui/Skeleton';
import useOracleStatus from '@/hooks/useOracleStatus';
import ProposeOutcomeForm from '@/components/oracle/ProposeOutcomeForm';
import clsx from 'clsx';
import useRegisterOracle from '@/hooks/useRegisterOracle';
import useMarkets from '@/hooks/useMarkets';
import Link from 'next/link';
import { formatEther, parseEther } from 'viem';
import { useAccount } from 'wagmi';
import { DEFAULT_ORACLE_STAKE } from '@/lib/contracts';
import { getOutcomeColor } from '@/lib/outcomeColors';
import { formatTokenAmount, truncateAddress } from '@/lib/formatters';

const heroSwatches = [0, 1, 2, 3].map((index) => getOutcomeColor(index));

export interface OracleDashboardProps {
    className?: string;
}

export default function OracleDashboard({ className }: OracleDashboardProps): JSX.Element {
    const { address } = useAccount();
    const { data, error, isError, isLoading } = useOracleStatus();
    const {
        registerOracle,
        increaseStake,
        deregisterOracle,
        error: registerError,
        isError: isRegisterError,
        isLoading: isRegisterLoading,
    } = useRegisterOracle();
    const { data: markets } = useMarkets();
    const pendingMarkets = markets.filter(
        (market) =>
            market.status === 'EXPIRED' ||
            market.status === 'RESOLUTION_OPEN' ||
            market.status === 'ESCALATED',
    );

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [showDeregisterModal, setShowDeregisterModal] = useState(false);
    const minimumStakeAmount = data?.minimumStakeAmount ?? DEFAULT_ORACLE_STAKE;
    const amountNeeded = data
        ? data.stakeAmount >= minimumStakeAmount
            ? 0n
            : minimumStakeAmount - data.stakeAmount
        : DEFAULT_ORACLE_STAKE;
    const [stakeAmount, setStakeAmount] = useState<string>(formatEther(amountNeeded > 0n ? amountNeeded : DEFAULT_ORACLE_STAKE));

    const stakeDisplay = formatEther(DEFAULT_ORACLE_STAKE);
    const minimumStakeDisplay = data?.minimumStakeFormatted ?? `${stakeDisplay} ETH`;
    const parsedStakeAmount = (() => {
        try {
            return parseEther(stakeAmount || '0');
        } catch {
            return 0n;
        }
    })();
    const isStakeTooLow = data?.isRegistered
        ? parsedStakeAmount <= 0n
        : data
            ? data.stakeAmount + parsedStakeAmount < minimumStakeAmount
            : parsedStakeAmount < minimumStakeAmount;

    const handleConfirmRegister = async (): Promise<void> => {
        setShowRegisterModal(false);
        if (data?.isRegistered) {
            await increaseStake(parsedStakeAmount);
            return;
        }

        await registerOracle(parsedStakeAmount);
    };

    const handleConfirmDeregister = async (): Promise<void> => {
        setShowDeregisterModal(false);
        await deregisterOracle();
    };

    const oracleActivity = markets
        .filter((market) => address && market.proposedBy?.toLowerCase() === address.toLowerCase())
        .map((market) => {
            const proposedOutcome = market.proposedOutcomeIndex !== null
                ? market.outcomes[market.proposedOutcomeIndex]?.label ?? `Outcome ${market.proposedOutcomeIndex}`
                : 'Unknown';
            const finalOutcome = market.finalOutcomeIndex !== null
                ? market.outcomes[market.finalOutcomeIndex]?.label ?? `Outcome ${market.finalOutcomeIndex}`
                : null;
            const wasSlashed =
                market.status === 'FINALIZED' &&
                market.committeeResolved &&
                market.finalOutcomeIndex !== null &&
                market.proposedOutcomeIndex !== null &&
                market.finalOutcomeIndex !== market.proposedOutcomeIndex;
            const wasRewarded =
                market.status === 'FINALIZED' &&
                market.disputeOpened &&
                market.finalOutcomeIndex === market.proposedOutcomeIndex;

            return {
                market,
                proposedOutcome,
                finalOutcome,
                label: wasSlashed
                    ? 'Proposal slashed'
                    : wasRewarded
                        ? 'Proposal defended'
                        : market.status === 'FINALIZED'
                            ? 'Proposal accepted'
                            : 'Proposal pending',
                description: wasSlashed
                    ? `Final outcome was ${finalOutcome}. Your proposal for ${proposedOutcome} was overturned.`
                    : wasRewarded
                        ? `Final outcome matched ${proposedOutcome}. Winning voters can claim from the committee reward pool.`
                        : market.status === 'FINALIZED'
                            ? `Final outcome: ${finalOutcome ?? proposedOutcome}.`
                            : `Proposed outcome: ${proposedOutcome}.`,
                tone: wasSlashed ? 'danger' : wasRewarded ? 'success' : 'neutral',
            };
        });

    const disputeActivity = markets
        .filter((market) => address && market.disputeOpenedBy?.toLowerCase() === address.toLowerCase())
        .map((market) => {
            const counterOutcome = market.disputeCounterOutcomeIndex !== null
                ? market.outcomes[market.disputeCounterOutcomeIndex]?.label ?? `Outcome ${market.disputeCounterOutcomeIndex}`
                : 'Unknown';
            const finalOutcome = market.finalOutcomeIndex !== null
                ? market.outcomes[market.finalOutcomeIndex]?.label ?? `Outcome ${market.finalOutcomeIndex}`
                : null;
            const succeeded =
                market.status === 'FINALIZED' &&
                market.disputeRefundsEnabled &&
                market.finalOutcomeIndex !== market.proposedOutcomeIndex;
            const failed =
                market.status === 'FINALIZED' &&
                market.disputeOpened &&
                !market.disputeRefundsEnabled;

            return {
                market,
                label: succeeded ? 'Dispute refunded' : failed ? 'Dispute stake lost' : 'Dispute pending',
                description: succeeded
                    ? `Your counter-outcome ${counterOutcome} beat the proposal. Dispute stake is refundable.`
                    : failed
                        ? `Final outcome was ${finalOutcome}. The dispute stake funded rewards/protocol fees.`
                        : `Counter-outcome: ${counterOutcome}.`,
                tone: succeeded ? 'success' : failed ? 'danger' : 'neutral',
            };
        });

    return (
        <section className={clsx("space-y-8 mt-20", className)}>
            <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
                <div className="space-y-8">
                    {/* Main Registry Card */}
                    <div className="relative overflow-hidden rounded-[32px] border border-white/8 bg-white/[0.025] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)] md:p-8 space-y-8">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 h-1">
                            <div className="grid h-full grid-cols-4">
                                {heroSwatches.map((color) => (
                                    <span key={color.hex} style={{ backgroundColor: color.hex }} />
                                ))}
                            </div>
                        </div>

                        <div className="relative flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                    {data?.isRegistered ? 'Oracle Node Active' : 'Oracle Seat Available'}
                                </div>
                                <div className="max-w-2xl space-y-3">
                                    <h1 className="text-4xl font-semibold leading-[1.02] tracking-tight text-white md:text-5xl">
                                        Oracle Governance.
                                    </h1>
                                    <p className="text-sm leading-7 text-white/45">
                                        Manage your locked stake and participate in committee-based market resolution.
                                    </p>
                                </div>
                            </div>
                            <div className="relative z-10 pt-2 shrink-0">
                                <Button
                                    variant="primary"
                                    className="gap-2"
                                    disabled={isRegisterLoading}
                                    onClick={() => {
                                        setStakeAmount(formatEther(amountNeeded > 0n ? amountNeeded : DEFAULT_ORACLE_STAKE));
                                        setShowRegisterModal(true);
                                    }}
                                    type="button"
                                >
                                    <Zap className="h-4 w-4" />
                                    {isRegisterLoading
                                        ? 'Staking...'
                                        : data?.isRegistered
                                            ? 'Increase Stake'
                                            : data && data.stakeAmount > 0n
                                                ? 'Restore Oracle'
                                                : 'Register Oracle'}
                                </Button>
                            </div>
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
                                        <span>Escalated Markets</span>
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

                    <div className="glass-card rounded-3xl p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-white/5 pb-4">
                            <div className="flex items-center gap-3">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                <h3 className="text-sm font-black uppercase tracking-widest">Oracle Activity</h3>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground tracking-widest">
                                {oracleActivity.length + disputeActivity.length} Records
                            </span>
                        </div>

                        <div className="space-y-3">
                            {oracleActivity.map((item) => (
                                <Link
                                    key={`proposal-${item.market.marketId}`}
                                    className={clsx(
                                        'block rounded-2xl border p-4 transition-colors hover:bg-white/[0.03]',
                                        item.tone === 'danger' && 'border-red-500/20 bg-red-500/5',
                                        item.tone === 'success' && 'border-emerald-500/20 bg-emerald-500/5',
                                        item.tone === 'neutral' && 'border-white/5 bg-white/[0.01]',
                                    )}
                                    href={`/markets/${item.market.marketId}`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-foreground">
                                                Market #{item.market.marketId} · {item.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground">{item.market.title}</p>
                                            <p className="text-[11px] leading-relaxed text-muted-foreground/80">
                                                {item.description}
                                            </p>
                                        </div>
                                        {item.market.committeeRewardPool > 0n ? (
                                            <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                                Reward pool {formatTokenAmount(
                                                    item.market.committeeRewardPool,
                                                    item.market.collateralSymbol === 'USDC' ? 6 : 18,
                                                    item.market.collateralSymbol,
                                                )}
                                            </span>
                                        ) : null}
                                    </div>
                                </Link>
                            ))}

                            {disputeActivity.map((item) => (
                                <Link
                                    key={`dispute-${item.market.marketId}`}
                                    className={clsx(
                                        'block rounded-2xl border p-4 transition-colors hover:bg-white/[0.03]',
                                        item.tone === 'danger' && 'border-red-500/20 bg-red-500/5',
                                        item.tone === 'success' && 'border-emerald-500/20 bg-emerald-500/5',
                                        item.tone === 'neutral' && 'border-white/5 bg-white/[0.01]',
                                    )}
                                    href={`/markets/${item.market.marketId}`}
                                >
                                    <p className="text-sm font-bold text-foreground">
                                        Market #{item.market.marketId} · {item.label}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">{item.market.title}</p>
                                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                                        {item.description}
                                    </p>
                                </Link>
                            ))}

                            {oracleActivity.length + disputeActivity.length === 0 ? (
                                <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 text-xs font-bold text-muted-foreground">
                                    No proposal or dispute history for {address ? truncateAddress(address) : 'this wallet'} yet.
                                </div>
                            ) : null}
                        </div>
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
                                for markets to expire, propose an initial outcome, and vote during the committee
                                resolution window. If your proposal is overturned by committee resolution, your
                                stake can be slashed.
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

                            <Button variant="danger" onClick={() => setShowDeregisterModal(true)} disabled={!data?.isRegistered}>Deregister Oracle</Button>
                        </div>
                    </div>
                </div>

                <aside>
                    <ProposeOutcomeForm isOracleRegistered={data?.isRegistered} />
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
                                <span className="font-mono text-lg font-bold text-foreground">{stakeAmount || '0'} ETH</span>
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Registry minimum</span>
                                <span className="font-mono text-sm text-muted-foreground">{minimumStakeDisplay}</span>
                            </div>
                            <div className="space-y-2 py-3">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                                        Amount to stake now
                                    </span>
                                    {amountNeeded > 0n ? (
                                        <button
                                            className="text-xs text-primary hover:underline"
                                            onClick={() => setStakeAmount(formatEther(amountNeeded))}
                                            type="button"
                                        >
                                            Needed: {formatEther(amountNeeded)} ETH
                                        </button>
                                    ) : null}
                                </div>
                                <input
                                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                                    min={data?.isRegistered ? '0' : formatEther(amountNeeded)}
                                    onChange={(event) => setStakeAmount(event.target.value)}
                                    placeholder={formatEther(amountNeeded > 0n ? amountNeeded : DEFAULT_ORACLE_STAKE)}
                                    type="number"
                                    value={stakeAmount}
                                />
                                {isStakeTooLow ? (
                                    <p className="text-xs text-amber-400">
                                        {data?.isRegistered
                                            ? 'Enter an amount greater than zero to increase your stake.'
                                            : `Stake must bring this oracle to at least ${minimumStakeDisplay}.`}
                                    </p>
                                ) : null}
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
                            disabled={isStakeTooLow}
                            onClick={() => void handleConfirmRegister()}
                            type="button"
                        >
                            <Zap className="h-4 w-4" />
                            {data?.isRegistered ? 'Add Stake' : `Confirm & Stake ${stakeAmount || '0'} ETH`}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Deregister Oracle Confirmation Modal */}
            <Modal
                open={showDeregisterModal}
                onClose={() => setShowDeregisterModal(false)}
                title="Deregister Oracle"
                description="Are you sure you want to deregister as an oracle?"
            >
                <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                    <Button
                        className="flex-1"
                        variant="outline"
                        size="md"
                        onClick={() => setShowDeregisterModal(false)}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1 gap-2"
                        size="md"
                        onClick={() => void handleConfirmDeregister()}
                        type="button"
                    >
                        <X className="h-4 w-4" />
                        Confirm Deregister
                    </Button>
                </div>
            </Modal>
        </section>
    );
}
