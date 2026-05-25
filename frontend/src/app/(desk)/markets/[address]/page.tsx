'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { parseUnits } from 'viem';
import { useAccount, useChainId, useReadContract } from 'wagmi';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Gavel,
  Lock,
  Vote,
  Shield,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import CofheBetProvider from '@/components/betting/CofheBetProvider';
import OutcomeSelector from '@/components/betting/OutcomeSelector';
import PoolDisplay from '@/components/betting/PoolDisplay';
import PrivateDiscussion from '@/components/markets/PrivateDiscussion';
import Button from '@/components/ui/Button';
import Skeleton from '@/components/ui/Skeleton';
import SecureComputeCard from '@/components/ui/SecureComputeCard';
import useAddLiquidity from '@/hooks/useAddLiquidity';
import useClaimLpPayout from '@/hooks/useClaimLpPayout';
import useDisputeOutcome from '@/hooks/useDisputeOutcome';
import useDisputeEscrow from '@/hooks/useDisputeEscrow';
import useEscalateMarket from '@/hooks/useEscalateMarket';
import useFinalizeMarket from '@/hooks/useFinalizeMarket';
import useMarketDetails from '@/hooks/useMarketDetails';
import usePrivatePositions from '@/hooks/usePrivatePositions';
import useProposeOutcome from '@/hooks/useProposeOutcome';
import useRedeemShares from '@/hooks/useRedeemShares';
import useRemoveLiquidity from '@/hooks/useRemoveLiquidity';
import useResolveDispute from '@/hooks/useResolveDispute';
import useVoteOnResolution from '@/hooks/useVoteOnResolution';
import useOracleStatus from '@/hooks/useOracleStatus';
import {
  formatAmount,
  formatDateTime,
  formatTokenAmount,
  truncateAddress,
} from '@/lib/formatters';
import { getContractAddresses, PREDICTION_MARKET_ABI } from '@/lib/contracts';
import { getOutcomeColor } from '@/lib/outcomeColors';

const BetModal = dynamic(() => import('@/components/betting/BetModal'), {
  ssr: false,
});

const RedeemModal = dynamic(() => import('@/components/betting/RedeemModal'), {
  ssr: false,
});

const MarketAnalytics = dynamic(() => import('@/components/betting/MarketAnalytics'), {
  ssr: false,
});

const PRICE_SCALE = 1_000_000_000_000_000_000n;

function DecryptingLoader(): JSX.Element {
  const [text, setText] = useState('DECRYPTING...');

  useEffect(() => {
    const chars = '0123456789ABCDEF';
    const interval = setInterval(() => {
      let scrambled = '0x';
      for (let i = 0; i < 8; i++) {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      }
      setText(scrambled);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center gap-2 text-primary/80 text-xs">
      <motion.div
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        <Lock className="h-4 w-4" />
      </motion.div>
      <span className="font-mono tracking-widest">{text}</span>
    </span>
  );
}

function MarketDetailDesk({ marketIdParam }: { marketIdParam: string }): JSX.Element {
  const chainId = useChainId();
  const { address } = useAccount();
  const addresses = getContractAddresses(chainId);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<string>('');
  const [tradeSide, setTradeSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isModalOpen, setModalOpen] = useState<boolean>(false);
  const [isRedeemModalOpen, setRedeemModalOpen] = useState<boolean>(false);
  const [isPortfolioVisible, setPortfolioVisible] = useState<boolean>(false);
  const [disputeAmount, setDisputeAmount] = useState<string>('0.01');
  const [disputeOutcomeId, setDisputeOutcomeId] = useState<string>('0');
  const [resolutionOutcomeId, setResolutionOutcomeId] = useState<string>('0');
  const [votingOutcomeIndex, setVotingOutcomeIndex] = useState<number | null>(null);
  const [addLiquidityAmount, setAddLiquidityAmount] = useState<string>('1');
  const [removeLiquidityAmount, setRemoveLiquidityAmount] = useState<string>('0');
  const { data, error, isError, isLoading } = useMarketDetails(marketIdParam);
  const privatePositions = usePrivatePositions(
    data?.marketId ?? 0,
    data?.outcomeCount ?? 0,
    Boolean(data) && isPortfolioVisible,
  );
  const proposeOutcomeMutation = useProposeOutcome();
  const addLiquidityMutation = useAddLiquidity();
  const claimLpPayoutMutation = useClaimLpPayout();
  const disputeOutcomeMutation = useDisputeOutcome();
  const disputeEscrowMutation = useDisputeEscrow();
  const escalateMarketMutation = useEscalateMarket();
  const [disputeEscrowMode, setDisputeEscrowMode] = useState<boolean>(false);

  const finalizeMarketMutation = useFinalizeMarket();
  const redeemMutation = useRedeemShares();
  const removeLiquidityMutation = useRemoveLiquidity();
  const resolveDisputeMutation = useResolveDispute();
  const voteOnResolutionMutation = useVoteOnResolution();
  const { data: oracleStatus } = useOracleStatus();
  const isOracle = oracleStatus?.isRegistered ?? false;
  const ownerQuery = useReadContract({
    address: addresses?.predictionMarket ?? undefined,
    abi: PREDICTION_MARKET_ABI,
    functionName: 'owner',
    query: {
      enabled: Boolean(addresses?.predictionMarket),
    },
  });
  const collateralDecimals = data?.collateralSymbol === 'USDC' ? 6 : 18;
  const isNativeCollateral =
    data?.collateralToken === '0x0000000000000000000000000000000000000000';

  const enrichedOutcomes = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.outcomes.map((outcome, index) => ({
      ...outcome,
      revealedShares: isPortfolioVisible ? (privatePositions.data[index] ?? 0n) : null,
    }));
  }, [data, isPortfolioVisible, privatePositions.data]);

  const selectedOutcome =
    enrichedOutcomes.find((outcome) => outcome.id === selectedOutcomeId) ?? null;
  const finalOutcome =
    data?.finalOutcomeIndex !== null && data?.finalOutcomeIndex !== undefined
      ? enrichedOutcomes.find((outcome) => outcome.outcomeIndex === data.finalOutcomeIndex) ?? null
      : null;
  const revealedWinningShares =
    finalOutcome && isPortfolioVisible ? (finalOutcome.revealedShares ?? 0n) : 0n;
  const sellDisabled = tradeSide === 'SELL' && (!isPortfolioVisible || (selectedOutcome?.revealedShares ?? 0n) === 0n);
  const disputeDeadlineMs = data?.resolutionWindowEndsAt ? Date.parse(data.resolutionWindowEndsAt) : Number.NaN;
  const isFinalizeWindowOpen =
    Number.isFinite(disputeDeadlineMs) && Date.now() >= disputeDeadlineMs;
  const resolutionVoteState = useMemo(() => {
    if (!data) {
      return { hasQuorum: false, hasResolvableWinner: false };
    }

    const hasQuorum = data.totalOracleVoteWeight >= data.resolutionQuorumStake;
    if (!hasQuorum || data.voteWeights.length === 0) {
      return { hasQuorum, hasResolvableWinner: false };
    }

    const sortedVoteWeights = [...data.voteWeights].sort((left, right) =>
      left === right ? 0 : left > right ? -1 : 1,
    );
    const highest = sortedVoteWeights[0] ?? 0n;
    const secondHighest = sortedVoteWeights[1] ?? 0n;

    return {
      hasQuorum,
      hasResolvableWinner: highest > 0n && highest > secondHighest,
    };
  }, [data]);
  const contractOwner =
    typeof ownerQuery.data === 'string' ? ownerQuery.data.toLowerCase() : null;
  const isContractOwner = Boolean(address && contractOwner && address.toLowerCase() === contractOwner);
  const selectedResolutionOutcome =
    enrichedOutcomes.find((outcome) => outcome.id === resolutionOutcomeId) ?? enrichedOutcomes[0] ?? null;
  const selectedDisputeOutcome =
    enrichedOutcomes.find((outcome) => outcome.id === disputeOutcomeId) ?? null;
  const voteLeaderboard = [...enrichedOutcomes]
    .sort((left, right) => Number((data?.voteWeights[right.outcomeIndex] ?? 0n) - (data?.voteWeights[left.outcomeIndex] ?? 0n)));
  const lpMaxFormatted =
    data && data.myLpShares > 0n ? formatAmount(data.myLpShares, collateralDecimals) : '0';

  useEffect(() => {
    if (!data || enrichedOutcomes.length === 0) {
      return;
    }



    if (
      !resolutionOutcomeId ||
      !enrichedOutcomes.some((outcome) => outcome.id === resolutionOutcomeId)
    ) {
      setResolutionOutcomeId(enrichedOutcomes[0]?.id ?? '0');
    }

    const firstCounterOutcome =
      enrichedOutcomes.find((outcome) => outcome.outcomeIndex !== data.proposedOutcomeIndex) ?? null;

    if (
      firstCounterOutcome &&
      (!disputeOutcomeId ||
        !enrichedOutcomes.some((outcome) => outcome.id === disputeOutcomeId) ||
        selectedDisputeOutcome?.outcomeIndex === data.proposedOutcomeIndex)
    ) {
      setDisputeOutcomeId(firstCounterOutcome.id);
    }
  }, [
    data,
    disputeOutcomeId,
    enrichedOutcomes,
    resolutionOutcomeId,
    selectedDisputeOutcome?.outcomeIndex,
    selectedOutcomeId,
  ]);

  const handleRedeem = (): void => {
    setRedeemModalOpen(true);
  };

  const handleResolveDispute = async (): Promise<void> => {
    if (!data || !selectedResolutionOutcome) {
      return;
    }

    await resolveDisputeMutation.resolveDispute(data.marketId, selectedResolutionOutcome.outcomeIndex);
  };

  const handleAddLiquidity = async (): Promise<void> => {
    if (!data) {
      return;
    }

    await addLiquidityMutation.addLiquidity(
      data.marketId,
      addLiquidityAmount,
      collateralDecimals,
      isNativeCollateral,
      data.collateralToken,
    );
  };

  const handleRemoveLiquidity = async (): Promise<void> => {
    if (!data) {
      return;
    }

    const lpSharesAmount = parseUnits(removeLiquidityAmount || '0', collateralDecimals);
    const minCollateralOut =
      data.myLpShares === 0n || data.totalLpShares === 0n
        ? 0n
        : (data.estimatedLpCollateralOut * lpSharesAmount * 95n) /
        (data.myLpShares * 100n);

    await removeLiquidityMutation.removeLiquidity(
      data.marketId,
      removeLiquidityAmount,
      minCollateralOut,
      collateralDecimals,
    );
  };

  const handleSetLpMax = (): void => {
    setRemoveLiquidityAmount(lpMaxFormatted.replace(/,/g, ''));
  };

  const lifecyclePanel = (() => {
    if (!data) {
      return null;
    }

    if (data.status === 'ACTIVE') {
      return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5 text-sm text-muted-foreground">
          Trading is open. Pool reserves, probabilities, and price impact stay public so the market
          is legible. Your cumulative position remains hidden unless you reveal it locally.
        </div>
      );
    }

    if (data.status === 'EXPIRED') {
      return (
        <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <Clock3 className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Trading has closed</p>
              <p className="text-sm text-muted-foreground">
                This market is waiting for an eligible oracle to propose a resolution.
              </p>
            </div>
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Oracle source</p>
            <a
              href={data.oracleSource}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary hover:underline"
            >
              {data.oracleSource}
            </a>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className="gap-2"
              onClick={() =>
                proposeOutcomeMutation.proposeOutcome(
                  data.marketId,
                  Number.parseInt(selectedOutcomeId, 10),
                )
              }
              disabled={proposeOutcomeMutation.isLoading || !selectedOutcome || !isOracle}
              type="button"
            >
              <ShieldCheck className="h-4 w-4" />
              {proposeOutcomeMutation.isLoading ? 'Submitting...' : 'Propose Selected Outcome'}
            </Button>
            <Link href="/oracle">
              <Button variant="outline" type="button">
                Become an Oracle
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (data.status === 'RESOLUTION_OPEN') {
      return (
        <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-5">
          <div className="flex items-start gap-3">
            <TimerReset className="mt-0.5 h-4 w-4 text-amber-300" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Resolution window live</p>
              <p className="text-sm text-muted-foreground">
                Proposed outcome: <span className="text-primary font-semibold">{enrichedOutcomes[data.proposedOutcomeIndex ?? 0]?.label ?? 'Unknown'}</span>
              </p>
            </div>
          </div>
          <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-3">
            <p>Proposed by {data.proposedBy ? truncateAddress(data.proposedBy) : 'Unknown'}</p>
            <p>
              Resolution deadline{' '}
              {data.resolutionWindowEndsAt ? formatDateTime(data.resolutionWindowEndsAt) : 'Unavailable'}
            </p>
            <p>
              Quorum {formatTokenAmount(data.totalOracleVoteWeight, 18, 'ETH')} /{' '}
              {formatTokenAmount(data.resolutionQuorumStake, 18, 'ETH')}
            </p>
          </div>
          <div className="grid gap-4">
            {data.disputeOpened && <div className="space-y-3 rounded-2xl border border-white/8 bg-black/10 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Committee voting</p>
                <p className="text-xs text-muted-foreground">
                  Registered oracles can cast one open, stake-weighted vote during this window.
                </p>
              </div>
              <div className="space-y-2">
                {voteLeaderboard.map((outcome) => (
                  <div
                    key={outcome.id}
                    className="flex items-center justify-between rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2"
                  >
                    <div>
                      <p className="text-sm text-foreground">{outcome.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatTokenAmount(
                          data.voteWeights[outcome.outcomeIndex] ?? 0n,
                          18,
                          'ETH vote weight',
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={
                        voteOnResolutionMutation.isLoading ||
                        data.hasVotedOnResolution ||
                        !isOracle
                      }
                      onClick={async () => {
                        setVotingOutcomeIndex(outcome.outcomeIndex);
                        try {
                          await voteOnResolutionMutation.voteOnResolution(
                            data.marketId,
                            outcome.outcomeIndex,
                          );
                        } finally {
                          setVotingOutcomeIndex(null);
                        }
                      }}
                      type="button"
                    >
                      <Vote className="h-4 w-4" />
                      {voteOnResolutionMutation.isLoading &&
                        votingOutcomeIndex === outcome.outcomeIndex
                        ? 'Voting...'
                        : data.hasVotedOnResolution &&
                          data.myVoteOutcomeIndex === outcome.outcomeIndex
                          ? 'Voted'
                          : 'Vote'}
                    </Button>
                  </div>
                ))}
              </div>
              {data.hasVotedOnResolution ? (
                <p className="text-xs text-muted-foreground">
                  Your vote weight snapshot:{' '}
                  {formatTokenAmount(data.myVoteWeightSnapshot, 18, 'ETH')}
                </p>
              ) : !isOracle ? (
                <p className="text-xs text-muted-foreground">
                  Connect a registered oracle wallet to vote on this resolution.
                </p>
              ) : null}
            </div>}
            {!data.disputeOpened && data.status === 'RESOLUTION_OPEN' ? (
              <div className="space-y-3 rounded-2xl border border-white/8 bg-black/10 p-5">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Open dispute</p>
                  <p className="text-xs text-muted-foreground">
                    Challenge the proposal by selecting a counter-outcome and posting dispute stake.
                  </p>
                </div>

                {/* Dual-Mode Escrow Tabs */}
                <div className="grid grid-cols-2 rounded-xl bg-white/[0.02] p-1 border border-white/5">
                  <button
                    type="button"
                    disabled
                    title="Privara escrow is moving into a separate adapter contract so the core market can deploy under the chain code-size limit."
                    onClick={() => setDisputeEscrowMode(true)}
                    className={clsx(
                      "py-1.5 text-xs font-medium rounded-lg transition-all",
                      disputeEscrowMode
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground opacity-50"
                    )}
                  >
                    Privara Escrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisputeEscrowMode(false)}
                    className={clsx(
                      "py-1.5 text-xs font-medium rounded-lg transition-all",
                      !disputeEscrowMode
                        ? "bg-white/5 text-foreground border border-white/10"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Direct Custody
                  </button>
                </div>

                <div className="space-y-1 text-[11px] text-muted-foreground bg-white/[0.01] rounded-lg p-2 border border-white/[0.02]">
                  {disputeEscrowMode ? (
                    <p className="flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-primary" />
                      Privara escrow is being split into a separate adapter so the core market stays deployable.
                    </p>
                  ) : (
                    <p className="flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
                      Direct ERC20 custody inside CipherMarket prediction contract.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Counter Outcome</label>
                    <div className="relative">
                      <select
                        className="appearance-none h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                        onChange={(event) => setDisputeOutcomeId(event.target.value)}
                        value={selectedDisputeOutcome?.id ?? ''}
                      >
                        {enrichedOutcomes
                          .filter((outcome) => outcome.outcomeIndex !== data.proposedOutcomeIndex)
                          .map((outcome) => (
                            <option key={outcome.id} className="bg-background" value={outcome.id}>
                              {outcome.label}
                            </option>
                          ))}
                      </select>
                      <div className="pointer-events-none text-xs absolute inset-y-0 right-3 flex items-center text-white/40">
                        ▼
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dispute Stake ({data.collateralSymbol})</label>
                    <input
                      className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-foreground outline-none focus:border-primary/50"
                      onChange={(event) => setDisputeAmount(event.target.value)}
                      value={disputeAmount}
                    />
                  </div>
                </div>

                {disputeEscrowMutation.isLoading && (
                  <SecureComputeCard
                    operation={disputeEscrowMutation.state.info.computeOperation}
                    estimatedSeconds={disputeEscrowMutation.state.info.estimatedSeconds}
                    errorMessage={disputeEscrowMutation.state.error?.message}
                    onRetry={() => {
                      disputeEscrowMutation.disputeWithEscrow(
                        data.marketId,
                        selectedDisputeOutcome?.outcomeIndex ?? 0,
                        disputeAmount,
                        collateralDecimals,
                        data.title,
                        selectedDisputeOutcome?.label ?? '',
                        data.collateralToken,
                        !disputeEscrowMode
                      );
                    }}
                  />
                )}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {!data.disputeOpened ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() =>
                  disputeEscrowMutation.disputeWithEscrow(
                    data.marketId,
                    selectedDisputeOutcome?.outcomeIndex ?? 0,
                    disputeAmount,
                    collateralDecimals,
                    data.title,
                    selectedDisputeOutcome?.label ?? '',
                    data.collateralToken,
                    !disputeEscrowMode
                  )
                }
                disabled={disputeEscrowMutation.isLoading || !selectedDisputeOutcome}
                type="button"
              >
                <AlertTriangle className="h-4 w-4" />
                {disputeEscrowMutation.isLoading ? 'Processing FHE...' : 'Open Dispute'}
              </Button>
            ) : null}
            {!data.disputeOpened ? (
              <Button
                className="gap-2"
                onClick={() => finalizeMarketMutation.finalizeMarket(data.marketId, 'undisputed')}
                disabled={finalizeMarketMutation.isLoading || !isFinalizeWindowOpen}
                type="button"
              >
                <CheckCircle2 className="h-4 w-4" />
                {finalizeMarketMutation.isLoading ? 'Finalizing...' : 'Finalize Undisputed'}
              </Button>
            ) : (
              <>
                <Button
                  className="gap-2"
                  onClick={() => finalizeMarketMutation.finalizeMarket(data.marketId, 'quorum')}
                  disabled={
                    finalizeMarketMutation.isLoading ||
                    !isFinalizeWindowOpen ||
                    !resolutionVoteState.hasResolvableWinner
                  }
                  type="button"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {finalizeMarketMutation.isLoading ? 'Finalizing...' : 'Finalize by Quorum'}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => escalateMarketMutation.escalateMarket(data.marketId)}
                  disabled={
                    escalateMarketMutation.isLoading ||
                    !isFinalizeWindowOpen ||
                    resolutionVoteState.hasResolvableWinner
                  }
                  type="button"
                >
                  <Gavel className="h-4 w-4" />
                  {escalateMarketMutation.isLoading ? 'Escalating...' : 'Escalate Unresolved'}
                </Button>
              </>
            )}
          </div>
          {!isFinalizeWindowOpen ? (
            <p className="text-xs text-muted-foreground">
              Finalization becomes available after the resolution window has passed.
            </p>
          ) : !data.disputeOpened ? (
            <p className="text-xs text-muted-foreground">
              No dispute was opened. The proposed outcome can now be finalized directly.
            </p>
          ) : !resolutionVoteState.hasQuorum ? (
            <p className="text-xs text-muted-foreground">
              Quorum was not reached. Escalate the market so the admin fallback can resolve it.
            </p>
          ) : !resolutionVoteState.hasResolvableWinner ? (
            <p className="text-xs text-muted-foreground">
              The committee vote is tied or fragmented. Escalation is required.
            </p>
          ) : null}
          {finalizeMarketMutation.isError && finalizeMarketMutation.error ? (
            <p className="text-xs text-destructive">{finalizeMarketMutation.error.message}</p>
          ) : null}
          {escalateMarketMutation.isError && escalateMarketMutation.error ? (
            <p className="text-xs text-destructive">{escalateMarketMutation.error.message}</p>
          ) : null}
        </div>
      );
    }

    if (data.status === 'ESCALATED') {
      return (
        <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-5">
          <div className="flex items-start gap-3">
            <Gavel className="mt-0.5 h-4 w-4 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Escalated resolution</p>
              <p className="text-sm text-muted-foreground">
                The oracle committee did not produce a decisive result. Admin fallback is now
                required to finalize the market.
              </p>
            </div>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <p>Dispute stake locked: {formatTokenAmount(data.disputeStakeTotal, collateralDecimals, data.collateralSymbol)}</p>
            <p>Oracle source: <a href={data.oracleSource} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{data.oracleSource}</a></p>
            <p>
              Escalation deadline:{' '}
              {data.escalationDeadline ? formatDateTime(data.escalationDeadline) : 'Unavailable'}
            </p>
          </div>
          {isContractOwner ? (
            <div className="space-y-3 rounded-2xl border border-white/8 bg-black/10 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">Admin resolution</p>
                <p className="text-xs text-muted-foreground">
                  Only the contract owner can resolve escalated markets. This path is fallback-only
                  and should be used when quorum or vote tie prevented committee finalization.
                </p>
              </div>
              <div className="grid gap-3">
                <label className="space-y-2 text-xs text-muted-foreground">
                  <span className="block">Final outcome</span>
                  <div className="relative">
                    <select
                      className="appearance-none h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                      onChange={(event) => setResolutionOutcomeId(event.target.value)}
                      value={selectedResolutionOutcome?.id ?? resolutionOutcomeId}
                    >
                      {enrichedOutcomes.map((outcome) => (
                        <option key={outcome.id} className="bg-background" value={outcome.id}>
                          {outcome.label}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none text-xs absolute inset-y-0 right-3 flex items-center text-white/40">
                      ▼
                    </div>
                  </div>
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  className="gap-2"
                  disabled={
                    resolveDisputeMutation.isLoading ||
                    !isFinalizeWindowOpen ||
                    !selectedResolutionOutcome
                  }
                  onClick={handleResolveDispute}
                  type="button"
                >
                  <Gavel className="h-4 w-4" />
                  {resolveDisputeMutation.isLoading ? 'Resolving...' : 'Resolve Escalated Market'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Oracle slashing is rule-based in committee-resolved markets. The admin fallback path
                here is outcome-only.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Escalated markets can be resolved only by the contract admin.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/8 p-5">
        <div className="flex items-start gap-3">
          <Trophy className="mt-0.5 h-4 w-4 text-primary" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Market finalized</p>
            <p className="text-sm text-muted-foreground">
              Winning outcome: {finalOutcome?.label ?? 'Unavailable'}.
            </p>
          </div>
        </div>
        <div className="grid gap-3 text-xs text-muted-foreground md:grid-cols-2">
          <p>
            Remaining winning shares:{' '}
            {formatTokenAmount(data.remainingWinningShares, collateralDecimals, 'shares')}
          </p>
          <p>
            Protocol fees reserved:{' '}
            {formatTokenAmount(data.accruedProtocolFees, collateralDecimals, data.collateralSymbol)}
          </p>
        </div>
      </div>
    );
  })();

  return (
    <main className="space-y-10 px-4 py-8 lg:px-10">
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-24 w-full max-w-5xl rounded-3xl" />
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
      ) : null}

      {isError && error ? (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive">
          {error.message}
        </div>
      ) : null}

      {data ? (
        <>
          <section className="max-w-5xl space-y-6 mt-20">
            {/* <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to markets
            </Link> */}

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
                  Economic v1 privacy
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {data.status}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Market #{data.marketId}
                </span>
              </div>
              <h2 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
                {data.title}
              </h2>
              <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                {data.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Closes
                </p>
                <p className="mt-2 text-sm text-foreground">{formatDateTime(data.expiryTime)}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Collateral
                </p>
                <p className="mt-2 text-sm text-foreground">{data.collateralSymbol}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Seeded Liquidity
                </p>
                <p className="mt-2 text-sm text-foreground">
                  {formatTokenAmount(data.seedLiquidity, collateralDecimals, data.collateralSymbol)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Oracle Source
                </p>
                <a
                  href={data.oracleSource}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block truncate text-sm text-primary hover:underline"
                  title={data.oracleSource}
                >
                  {data.oracleSource}
                </a>
              </div>
            </div>
          </section>

          <div className="grid gap-8 xl:grid-cols-[1fr,400px]">
            <div className="space-y-8">
              <MarketAnalytics
                outcomes={enrichedOutcomes}
                totalLiquidity={data.totalLiquidity}
                collateralSymbol={data.collateralSymbol}
              />
              <PoolDisplay pools={data.pools} />

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Private Position
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setPortfolioVisible((current) => !current)}
                    type="button"
                  >
                    {isPortfolioVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {isPortfolioVisible ? 'Hide values' : 'Reveal values'}
                  </Button>
                </div>

                {privatePositions.isError && privatePositions.error ? (
                  <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                    {privatePositions.error.message}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  {enrichedOutcomes.map((outcome) => {
                    const color = getOutcomeColor(outcome.outcomeIndex);

                    return (
                      <div
                        key={outcome.id}
                        className="rounded-2xl border p-4"
                        style={{
                          background: `linear-gradient(135deg, ${color.softBackground}, rgba(255, 255, 255, 0.025))`,
                          borderColor: color.border,
                        }}
                      >
                        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: `0 0 12px ${color.shadow}`,
                            }}
                          />
                          {outcome.label}
                        </p>
                        <p className="mt-2 font-mono text-xl text-foreground">
                          {!isPortfolioVisible
                            ? '••••'
                            : privatePositions.isLoading
                              ? <DecryptingLoader />
                              : formatTokenAmount(
                                outcome.revealedShares ?? 0n,
                                collateralDecimals,
                                'shares',
                              )}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {!isPortfolioVisible
                            ? 'Hidden until you reveal locally.'
                            : privatePositions.isLoading
                              ? 'Estimating value after decrypt...'
                              : `Est. active value ${formatTokenAmount(
                                ((outcome.revealedShares ?? 0n) * outcome.probability) / PRICE_SCALE,
                                collateralDecimals,
                                data.collateralSymbol,
                              )}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* <div className="glass-card space-y-3 rounded-3xl p-8">
                <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                  Market Mechanics
                </h3>
                <div className="grid gap-4 text-xs text-muted-foreground md:grid-cols-2">
                  <p>
                    CipherMarket uses a seeded fixed-product market maker. Pool reserves, prices,
                    and probabilities remain public so quoting and settlement stay standard.
                  </p>
                  <p>
                    What stays private in v1 is your cumulative position. Other users cannot read
                    whether you hold shares, how many you hold, or which outcome you accumulated
                    from contract storage.
                  </p>
                </div>
              </div> */}

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      LP Position
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Non-transferable market shares
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Your LP Shares
                    </p>
                    <p className="mt-2 font-mono text-xl text-foreground">
                      {formatTokenAmount(data.myLpShares, collateralDecimals, data.collateralSymbol)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Total LP Shares
                    </p>
                    <p className="mt-2 font-mono text-xl text-foreground">
                      {formatTokenAmount(data.totalLpShares, collateralDecimals, data.collateralSymbol)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      {data.status === 'FINALIZED' ? 'LP Claim Estimate' : 'Active Exit Estimate'}
                    </p>
                    <p className="mt-2 font-mono text-xl text-foreground">
                      {formatTokenAmount(
                        data.status === 'FINALIZED'
                          ? data.estimatedFinalLpPayout
                          : data.estimatedLpCollateralOut,
                        collateralDecimals,
                        data.collateralSymbol,
                      )}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {data.status === 'FINALIZED'
                        ? 'Estimated final claim after winner reserves and protocol fees.'
                        : 'Current removable value from live pool reserves.'}
                    </p>
                  </div>
                </div>

                {data.status === 'ACTIVE' ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <p className="text-sm font-semibold text-foreground">Add liquidity</p>
                      <input
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-foreground outline-none focus:border-primary/50"
                        value={addLiquidityAmount}
                        onChange={(event) => setAddLiquidityAmount(event.target.value)}
                      />
                      <Button
                        className="w-full"
                        type="button"
                        onClick={() => void handleAddLiquidity()}
                        disabled={addLiquidityMutation.isLoading}
                      >
                        {addLiquidityMutation.isLoading ? 'Adding...' : `Add ${data.collateralSymbol}`}
                      </Button>
                    </div>
                    <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">Remove liquidity</p>
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline disabled:text-muted-foreground"
                          onClick={handleSetLpMax}
                          disabled={data.myLpShares === 0n}
                        >
                          Max
                        </button>
                      </div>
                      <input
                        className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-foreground outline-none focus:border-primary/50"
                        value={removeLiquidityAmount}
                        onChange={(event) => setRemoveLiquidityAmount(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Available: {formatTokenAmount(data.myLpShares, collateralDecimals, data.collateralSymbol)}
                      </p>
                      <Button
                        variant="outline"
                        className="w-full"
                        type="button"
                        onClick={() => void handleRemoveLiquidity()}
                        disabled={removeLiquidityMutation.isLoading || data.myLpShares === 0n}
                      >
                        {removeLiquidityMutation.isLoading ? 'Removing...' : 'Remove Liquidity'}
                      </Button>
                    </div>
                  </div>
                ) : data.status === 'FINALIZED' ? (
                  <div className="space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-sm text-muted-foreground">
                      LP exits are settled after finalization. Claim your pro-rata residual market
                      value once winner and protocol reserves are accounted for.
                    </p>
                    <Button
                      className="w-full"
                      type="button"
                      onClick={() => void claimLpPayoutMutation.claimLpPayout(data.marketId)}
                      disabled={claimLpPayoutMutation.isLoading || data.myLpShares === 0n}
                    >
                      {claimLpPayoutMutation.isLoading ? 'Claiming...' : 'Claim LP Payout'}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    LP add/remove stays available only while the market is active. Once resolution
                    starts, liquidity is locked until the final LP payout stage.
                  </p>
                )}

                {addLiquidityMutation.isError && addLiquidityMutation.error ? (
                  <p className="text-xs text-destructive">{addLiquidityMutation.error.message}</p>
                ) : null}
                {removeLiquidityMutation.isError && removeLiquidityMutation.error ? (
                  <p className="text-xs text-destructive">{removeLiquidityMutation.error.message}</p>
                ) : null}
                {claimLpPayoutMutation.isError && claimLpPayoutMutation.error ? (
                  <p className="text-xs text-destructive">{claimLpPayoutMutation.error.message}</p>
                ) : null}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Outcome Board
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Pool prices are public
                  </span>
                </div>
                <OutcomeSelector
                  collateralDecimals={collateralDecimals}
                  collateralSymbol={data.collateralSymbol}
                  onSelect={setSelectedOutcomeId}
                  outcomes={enrichedOutcomes}
                  selectedOutcomeId={selectedOutcome?.id ?? ''}
                  // disabled={data.status !== 'ACTIVE'}
                />
              </div>

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Trade Panel
                    </h3>
                  </div>
                  <div className="inline-flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                    <button
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${tradeSide === 'BUY' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      onClick={() => setTradeSide('BUY')}
                      type="button"
                    >
                      Buy
                    </button>
                    <button
                      className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors ${tradeSide === 'SELL' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      onClick={() => setTradeSide('SELL')}
                      type="button"
                    >
                      Sell
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-xs text-muted-foreground">
                  {tradeSide === 'BUY'
                    ? selectedOutcome
                      ? 'Estimate the quote, confirm in wallet, and the pool updates immediately while your resulting position stays private.'
                      : 'Choose an outcome above to start a buy quote.'
                    : !isPortfolioVisible
                      ? 'Reveal your private position first so CipherMarket knows which shares are available to sell.'
                      : selectedOutcome
                        ? 'Selling requires a verified private balance. CipherMarket verifies that balance before execution.'
                        : 'Choose an outcome above to prepare a sell.'}
                </div>

                <Button
                  size="lg"
                  className="w-full"
                  disabled={data.status !== 'ACTIVE' || !selectedOutcome || sellDisabled}
                  onClick={() => setModalOpen(true)}
                  type="button"
                >
                  {tradeSide === 'BUY'
                    ? selectedOutcome
                      ? 'Buy Shares'
                      : 'Select Outcome to Buy'
                    : sellDisabled
                      ? 'Reveal Position to Sell'
                      : 'Sell Shares'}
                </Button>
              </div>

              <div className="glass-card space-y-6 rounded-3xl p-8">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                    Lifecycle
                  </h3>
                  <Link href="/docs" className="text-xs text-primary hover:underline">
                    Read docs
                  </Link>
                </div>
                {lifecyclePanel}

                {proposeOutcomeMutation.isError && proposeOutcomeMutation.error ? (
                  <p className="text-xs text-destructive">{proposeOutcomeMutation.error.message}</p>
                ) : null}
                {disputeOutcomeMutation.isError && disputeOutcomeMutation.error ? (
                  <p className="text-xs text-destructive">{disputeOutcomeMutation.error.message}</p>
                ) : null}
                {finalizeMarketMutation.isError && finalizeMarketMutation.error ? (
                  <p className="text-xs text-destructive">{finalizeMarketMutation.error.message}</p>
                ) : null}
                {voteOnResolutionMutation.isError && voteOnResolutionMutation.error ? (
                  <p className="text-xs text-destructive">{voteOnResolutionMutation.error.message}</p>
                ) : null}
                {resolveDisputeMutation.isError && resolveDisputeMutation.error ? (
                  <p className="text-xs text-destructive">{resolveDisputeMutation.error.message}</p>
                ) : null}
              </div>

              {data.status === 'FINALIZED' ? (
                <div className="glass-card space-y-5 rounded-3xl p-8">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-primary" />
                    <h3 className="font-mono text-sm uppercase tracking-[0.22em] text-foreground">
                      Redemption
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-white/[0.03] p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                      Redeemable winning shares
                    </p>
                    <p className="mt-2 font-mono text-xl text-foreground">
                      {!isPortfolioVisible
                        ? '••••'
                        : privatePositions.isLoading
                          ? <DecryptingLoader />
                          : formatTokenAmount(revealedWinningShares, collateralDecimals, data.collateralSymbol)}
                    </p>
                  </div>

                  <Button
                    className="w-full gap-2"
                    disabled={!isPortfolioVisible || revealedWinningShares === 0n || data.hasRedeemed}
                    onClick={handleRedeem}
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {data.hasRedeemed ? 'Already Redeemed' : 'Redeem Winning Shares'}
                  </Button>
                  {!isPortfolioVisible ? (
                    <p className="text-xs text-muted-foreground">
                      Reveal values in the Private Position panel first so the app can confirm your
                      winning balance.
                    </p>
                  ) : revealedWinningShares === 0n && !data.hasRedeemed ? (
                    <p className="text-xs text-muted-foreground">
                      No winning shares are visible for this wallet.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </aside>
          </div>

          <PrivateDiscussion marketId={data.marketId} />

          {selectedOutcome ? (
            <BetModal
              marketId={data.marketId}
              marketTitle={data.title}
              collateralDecimals={collateralDecimals}
              collateralSymbol={data.collateralSymbol}
              collateralToken={data.collateralToken}
              onClose={() => setModalOpen(false)}
              open={isModalOpen}
              outcome={selectedOutcome}
              side={tradeSide}
              userShares={isPortfolioVisible ? (selectedOutcome.revealedShares ?? undefined) : undefined}
            />
          ) : null}

          {data ? (
            <RedeemModal
              marketId={data.marketId}
              marketTitle={data.title}
              winningShares={revealedWinningShares}
              collateralSymbol={data.collateralSymbol}
              collateralDecimals={collateralDecimals}
              finalOutcomeIndex={data.finalOutcomeIndex}
              hasRedeemed={data.hasRedeemed}
              open={isRedeemModalOpen}
              onClose={() => setRedeemModalOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}

export default function Page({
  params,
}: {
  params: { address: string };
}): JSX.Element {
  return (
    <CofheBetProvider>
      <MarketDetailDesk marketIdParam={params.address} />
    </CofheBetProvider>
  );
}
