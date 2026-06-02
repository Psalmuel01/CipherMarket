'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  FlaskConical,
  ListChecks,
  Settings2,
  FileCheck2,
  Loader2,
  Plus,
  Trash2,
  Lock,
  Shield,
  Info,
  Calendar,
  Layers,
  Cpu,
  Fingerprint
} from 'lucide-react';
import Link from 'next/link';
import { useChainId } from 'wagmi';
import Button from '@/components/ui/Button';
import useCreateMarket from '@/hooks/useCreateMarket';
import { getContractAddresses, NATIVE_ETH_ADDRESS } from '@/lib/contracts';
import clsx from 'clsx';
import type { MarketType } from '@/types/market';
import { formatUnits, parseUnits } from 'viem';
import type { Address } from 'viem';
import PrivacyBadge from '@/components/ui/PrivacyBadge';

const STEPS = [
  { id: 'Type', icon: FlaskConical, label: 'Market Type' },
  { id: 'Outcomes', icon: ListChecks, label: 'Outcomes' },
  { id: 'Config', icon: Settings2, label: 'Configure' },
  { id: 'Confirm', icon: FileCheck2, label: 'Verify' },
] as const;

const CATEGORIES = ['Crypto', 'Tech', 'Finance', 'Politics', 'Entertainment', 'Other'];

export interface CreateMarketFormProps {
  className?: string;
}

export default function CreateMarketForm({ className }: CreateMarketFormProps): JSX.Element {
  const chainId = useChainId();
  const addresses = getContractAddresses(chainId);
  const { createMarket, data, error, isError, isLoading, reset } = useCreateMarket();
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [marketType, setMarketType] = useState<MarketType>('BINARY');
  const [category, setCategory] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>(
    '',
  );
  const [oracleSource, setOracleSource] = useState<string>('');
  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO']);
  const [expiryTime, setExpiryTime] = useState<string>('');
  const [minimumTrade, setMinimumTrade] = useState<string>('0.01');
  const [seedLiquidity, setSeedLiquidity] = useState<string>('0.1');
  const [collateralToken, setCollateralToken] = useState<Address>(NATIVE_ETH_ADDRESS);

  const collateralOptions = useMemo(
    () => [
      { label: 'ETH', value: NATIVE_ETH_ADDRESS },
      ...(addresses?.usdc ? [{ label: 'USDC', value: addresses.usdc }] : []),
    ],
    [addresses?.usdc],
  );

  const collateralDecimals = collateralToken === NATIVE_ETH_ADDRESS ? 18 : 6;
  const collateralSymbol = collateralToken === NATIVE_ETH_ADDRESS ? 'ETH' : 'USDC';
  const expiryTimestamp = new Date(expiryTime).getTime();
  const isExpiryInPast = !Number.isNaN(expiryTimestamp) && expiryTimestamp <= Date.now();

  const isValidUrl = (value: string): boolean => {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const isOracleSourceValid = oracleSource.trim().length === 0 || isValidUrl(oracleSource.trim());

  const minimumRequiredSeedLiquidity = useMemo(() => {
    try {
      const parsedMinimumTrade = parseUnits(minimumTrade || '0', collateralDecimals);
      return parsedMinimumTrade * BigInt(outcomes.length);
    } catch {
      return 0n;
    }
  }, [collateralDecimals, minimumTrade, outcomes.length]);

  const parsedSeedLiquidity = useMemo(() => {
    try {
      return parseUnits(seedLiquidity || '0', collateralDecimals);
    } catch {
      return 0n;
    }
  }, [collateralDecimals, seedLiquidity]);

  const isSeedLiquidityTooSmall =
    minimumRequiredSeedLiquidity > 0n && parsedSeedLiquidity < minimumRequiredSeedLiquidity;

  const minimumLiquidityLabel = useMemo(() => {
    if (minimumRequiredSeedLiquidity === 0n) return null;
    return formatUnits(minimumRequiredSeedLiquidity, collateralDecimals);
  }, [collateralDecimals, minimumRequiredSeedLiquidity]);

  const handleAddOutcome = (): void => {
    setOutcomes((current) => [...current, `Outcome ${current.length + 1}`]);
  };

  const handleRemoveOutcome = (index: number): void => {
    if (outcomes.length <= 2) return;
    setOutcomes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateOutcome = (index: number, value: string): void => {
    setOutcomes((current) => current.map((outcome, currentIndex) => (currentIndex === index ? value : outcome)));
  };

  const handleTypeChange = (nextType: MarketType): void => {
    reset();
    setMarketType(nextType);
    if (nextType === 'BINARY') {
      setOutcomes(['YES', 'NO']);
    } else {
      setOutcomes(['Outcome 1', 'Outcome 2']);
    }
  };

  const handleCollateralChange = (nextCollateral: Address): void => {
    reset();
    setCollateralToken(nextCollateral);
    if (nextCollateral === NATIVE_ETH_ADDRESS) {
      setMinimumTrade('0.01');
      setSeedLiquidity('0.1');
    } else {
      setMinimumTrade('1');
      setSeedLiquidity('10');
    }
  };

  const isStepValid = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return title.trim().length > 0 && description.trim().length > 0 && category.trim().length > 0;
      case 1:
        return outcomes.length >= 2 && outcomes.every((o) => o.trim().length > 0);
      case 2:
        return (
          expiryTime.length > 0 &&
          !isExpiryInPast &&
          isValidUrl(oracleSource.trim()) &&
          parseFloat(minimumTrade) > 0 &&
          !isSeedLiquidityTooSmall
        );
      case 3:
        return true;
      default:
        return false;
    }
  }, [
    stepIndex,
    title,
    description,
    category,
    outcomes,
    expiryTime,
    isExpiryInPast,
    oracleSource,
    minimumTrade,
    isSeedLiquidityTooSmall,
  ]);

  const handleSubmit = async (): Promise<void> => {
    if (!isStepValid) return;
    await createMarket({
      title,
      description,
      category,
      oracleSource,
      marketType,
      outcomes,
      expiryTime,
      collateralToken,
      minimumTrade,
      seedLiquidity,
    });
  };

  if (data) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-20 rounded-[32px] p-20 text-center space-y-20 max-w-2xl mx-auto border border-primary/20 bg-[#050505] shadow-2xl"
      >
        <div className="flex justify-center">
          <div className="relative">
            <div className="relative rounded-full bg-primary/10 p-10 text-primary border border-primary/20">
              <CheckCircle2 className="h-20 w-20" />
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-4xl font-serif italic text-white tracking-tight">Market Published</h2>
          <p className="text-white/40 font-light max-w-sm mx-auto leading-relaxed">
            Your privacy-sealed liquidity pool is now live on Fhenix.
            All trade data will be computed in the dark.
          </p>
        </div>
        <div className="pt-8 flex flex-col sm:flex-row justify-center gap-6">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Create Another
          </Button>
          <Link href="/dashboard">
            <Button className="gap-3 shadow-2xl">
              View Markets
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={clsx('mx-auto w-full max-w-[1200px] space-y-14 px-0 pb-24 sm:space-y-20 sm:px-4 lg:px-8', className)}>
      {/* Header */}
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        {/* <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2.5 font-mono text-[10px] uppercase tracking-[0.4em] text-primary bg-primary/5 border border-primary/20 rounded-full px-5 py-2.5"
        >
          <Fingerprint className="h-3.5 w-3.5" />
          Secure Protocol Deployment
        </motion.div> */}
        <h1 className="mt-16 text-[clamp(2rem,10vw,3rem)] font-serif italic leading-[1.1] tracking-tight text-white lg:mt-20 lg:text-5xl">
          Initialize a new<br />
          <span className="font-sans font-light text-white/20 not-italic">confidential market.</span>
        </h1>
      </div>

      {/* Modern Progress System */}
      <div className="relative mx-auto flex max-w-2xl items-center justify-between px-2 sm:px-12">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/10 -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-[1px] bg-primary -translate-y-1/2 transition-all duration-700 ease-[0.16,1,0.3,1]"
          style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < stepIndex;
          const isActive = index === stepIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-6">
              <button
                onClick={() => index <= stepIndex && setStepIndex(index)}
                disabled={index > stepIndex}
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-500',
                  isCompleted
                    ? 'bg-primary border-primary text-white'
                    : isActive
                      ? 'bg-black border-primary/50 text-primary'
                      : 'bg-black border-white/10 text-white/20'
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </button>
              <span
                className={clsx(
                  'absolute -bottom-10 hidden whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] transition-all duration-500 min-[420px]:block sm:tracking-[0.3em]',
                  isActive ? 'text-primary' : 'text-white/30'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <motion.div
        key={STEPS[stepIndex].id}
        className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#050505] p-4 sm:p-8 lg:p-12"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex min-h-[450px] flex-col">
          <div className="flex-1 space-y-12">
            {stepIndex === 0 && (
              <div className="space-y-10 sm:space-y-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">
                    <div className="h-px w-8 bg-white/20" />
                    Step 01 / Market Architecture
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    {[
                      {
                        type: 'BINARY' as const,
                        title: 'Binary Structure',
                        description: 'Simple dual-outcome resolution. Optimized for maximum liquidity depth.',
                        icon: FlaskConical
                      },
                      {
                        type: 'CATEGORICAL' as const,
                        title: 'Categorical Map',
                        description: 'Multi-dimensional outcomes for complex event modeling.',
                        icon: Layers
                      },
                    ].map((option) => (
                      <button
                        key={option.type}
                        className={clsx(
                          'group relative flex min-h-44 flex-col items-start gap-5 rounded-2xl border p-5 text-left transition-all duration-300 sm:gap-6 sm:p-8',
                          marketType === option.type
                            ? 'border-primary/50 bg-primary/[0.03]'
                            : 'border-white/10 bg-white/[0.01] hover:border-white/20'
                        )}
                        onClick={() => handleTypeChange(option.type)}
                        type="button"
                      >
                        <div
                          className={clsx(
                            'rounded-xl p-4 transition-all duration-300',
                            marketType === option.type
                              ? 'bg-primary text-white'
                              : 'bg-white/[0.05] text-white/40 group-hover:bg-white/10'
                          )}
                        >
                          <option.icon className="h-6 w-6" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-lg font-bold text-white tracking-tight">{option.title}</p>
                          <p className="text-sm text-white/40 leading-relaxed font-light">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-8">
                  <div className="space-y-3">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Market Identity</label>
                    <input
                      className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.01] px-4 text-base font-bold text-white outline-none transition-all placeholder:text-white/20 focus:border-primary/50 sm:px-6 sm:text-lg"
                      onChange={(e) => { reset(); setTitle(e.target.value); }}
                      placeholder="e.g. Will ETH break $5,000 by year end?"
                      value={title}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Deployment Description</label>
                    <textarea
                      className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/[0.01] px-6 py-4 text-base font-light text-white/70 placeholder:text-white/20 outline-none focus:border-primary/50 transition-all leading-relaxed"
                      onChange={(e) => { reset(); setDescription(e.target.value); }}
                      placeholder="Specify exactly how this market should be resolved..."
                      value={description}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Primary Domain</label>
                    <div className="flex flex-wrap gap-3">
                      {CATEGORIES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setCategory(item)}
                          className={clsx(
                            "min-h-11 rounded-xl px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all sm:px-5",
                            category === item
                              ? "bg-primary text-white"
                              : "bg-white/[0.03] text-white/40 border border-white/10 hover:bg-white/10"
                          )}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-12">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">
                      <div className="h-px w-8 bg-white/20" />
                      Step 02 / Outcome Definitions
                    </div>
                    <h3 className="text-2xl font-serif italic text-white sm:text-3xl">Define the possibilities.</h3>
                  </div>
                  {marketType === 'CATEGORICAL' && (
                    <Button onClick={handleAddOutcome} size="sm" variant="outline" className="h-10 px-4 rounded-xl gap-2 text-[10px]">
                      <Plus className="h-4 w-4" />
                      Add Branch
                    </Button>
                  )}
                </div>

                <div className="grid gap-4">
                  {outcomes.map((outcome, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 group sm:gap-4"
                    >
                      <div className="flex-1 relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 font-mono text-[10px] text-primary/60 font-bold">
                          #{(idx + 1).toString().padStart(2, '0')}
                        </div>
                        <input
                          className={clsx(
                            "h-14 w-full rounded-xl border px-14 text-base font-bold transition-all outline-none sm:px-16",
                            marketType === 'BINARY'
                              ? "bg-white/[0.02] border-white/5 text-white/30 cursor-not-allowed"
                              : "bg-white/[0.03] border-white/10 text-white focus:border-primary/50"
                          )}
                          disabled={marketType === 'BINARY'}
                          onChange={(e) => { reset(); updateOutcome(idx, e.target.value); }}
                          value={outcome}
                        />
                      </div>
                      {marketType === 'CATEGORICAL' && outcomes.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOutcome(idx)}
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/40 transition-all hover:text-primary"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-[12px] text-white/40 leading-relaxed font-light italic">
                    All outcome weights are encrypted on-chain. Indices are public,
                    but volume distribution remains sealed until resolution.
                  </p>
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div className="space-y-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">
                    <div className="h-px w-8 bg-white/20" />
                    Step 03 / Operational Guardrails
                  </div>
                  <h3 className="text-2xl font-serif italic text-white sm:text-3xl">Execution Parameters.</h3>
                </div>

                <div className="grid gap-10 md:grid-cols-2">
                  <div className="space-y-3">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Market Finality</label>
                    <div className="relative group">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                      <input
                        className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.01] pl-16 pr-8 text-sm font-bold text-white outline-none focus:border-primary/50"
                        onChange={(e) => { reset(); setExpiryTime(e.target.value); }}
                        type="datetime-local"
                        value={expiryTime}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Settlement Asset</label>
                    <div className="relative">
                      <select
                        className="appearance-none h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                        onChange={(e) => handleCollateralChange(e.target.value as Address)}
                        value={collateralToken}
                      >
                        {collateralOptions.map((option) => (
                          <option key={option.value} className="bg-background" value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <div className="pointer-events-none text-xs absolute inset-y-0 right-3 flex items-center text-white/40">
                        ▼
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 md:col-span-2">
                    <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Oracle Verification Source</label>
                    <div className="relative group">
                      <Cpu className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/20 group-focus-within:text-primary transition-colors" />
                      <input
                        className={clsx(
                          "h-14 w-full rounded-xl border bg-white/[0.01] pl-16 pr-8 text-base font-medium text-white/60 outline-none transition-all",
                          !isOracleSourceValid
                            ? 'border-red-500/50 focus:border-red-500/70'
                            : 'border-white/10 focus:border-primary/50'
                        )}
                        onChange={(e) => { reset(); setOracleSource(e.target.value); }}
                        placeholder="https://example.com/resolution-source"
                        type="url"
                        value={oracleSource}
                      />
                    </div>
                    {!isOracleSourceValid && (
                      <p className="px-2 text-[11px] font-medium text-red-400">
                        Oracle source must be a valid URL (https://...)
                      </p>
                    )}
                  </div>

                  <div className="space-y-8 md:col-span-2">
                    <div className="grid gap-8 sm:grid-cols-2">
                      <div className="space-y-3">
                        <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Minimum Trade</label>
                        <input
                          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.01] px-6 text-lg font-bold text-white outline-none focus:border-primary/50"
                          onChange={(e) => { reset(); setMinimumTrade(e.target.value); }}
                          value={minimumTrade}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="px-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">Genesis Liquidity</label>
                        <input
                          className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.01] px-6 text-lg font-bold text-white outline-none focus:border-primary/50"
                          onChange={(e) => { reset(); setSeedLiquidity(e.target.value); }}
                          value={seedLiquidity}
                        />
                      </div>
                    </div>

                    <div className={clsx(
                      "p-6 rounded-2xl border transition-all duration-300",
                      isSeedLiquidityTooSmall ? "bg-red-500/5 border-red-500/20" : "bg-white/[0.01] border-white/10"
                    )}>
                      <div className="flex flex-col gap-2 text-[10px] font-mono font-bold uppercase tracking-widest sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-white/20">Genesis Requirement</span>
                        <span className={isSeedLiquidityTooSmall ? "text-red-400" : "text-primary"}>
                          {minimumLiquidityLabel} {collateralSymbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-12">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 sm:tracking-[0.3em]">
                    <div className="h-px w-8 bg-white/20" />
                    Step 04 / Final Verification
                  </div>
                  <h3 className="text-2xl font-serif italic text-white sm:text-3xl">Immutable commitment.</h3>
                </div>

                <div className="relative rounded-3xl border border-white/10 bg-white/[0.01] shadow-2xl">
                  <div className="static p-5 pb-0 sm:absolute sm:right-0 sm:top-0 sm:p-8">
                    <PrivacyBadge state="sealed" />
                  </div>
                  <div className="space-y-8 p-5 sm:space-y-10 sm:p-10">
                    <div className="space-y-3">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-primary sm:tracking-[0.4em]">Market Intent</p>
                      <h2 className="break-words text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">{title}</h2>
                      <p className="text-base text-white/40 font-light leading-relaxed max-w-2xl italic">{description}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-5 border-t border-white/10 pt-8 min-[380px]:grid-cols-2 md:grid-cols-4 md:gap-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Protocol</p>
                        <p className="text-xs font-bold text-white">{marketType}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Domain</p>
                        <p className="text-xs font-bold text-white">{category}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Currency</p>
                        <p className="text-xs font-bold text-white">{collateralSymbol}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/30">Outcomes</p>
                        <p className="text-xs font-bold text-white">{outcomes.length} Points</p>
                      </div>
                    </div>

                    <div className="grid gap-6 rounded-[24px] border border-white/10 bg-white/[0.03] p-5 sm:p-8 md:grid-cols-2 md:gap-8">
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 font-bold">Genesis Supply</p>
                        <p className="text-2xl font-serif italic text-primary">{seedLiquidity} <span className="text-xs not-italic font-sans text-white/30">{collateralSymbol}</span></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-white/40 font-bold">Oracle Target</p>
                        <p className="text-xs font-medium text-white/60 truncate italic">{oracleSource}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 flex flex-col-reverse gap-3 border-t border-white/10 pt-8 sm:mt-16 sm:flex-row sm:items-center sm:justify-between sm:pt-10">
            <Button
              disabled={stepIndex === 0 || isLoading}
              onClick={() => setStepIndex((prev) => prev - 1)}
              variant="secondary"
              className="h-12 w-full sm:w-auto"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <AnimatePresence mode="wait">
              {stepIndex === STEPS.length - 1 ? (
                <motion.div
                  key="deploy"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <Button
                    disabled={isLoading || !isStepValid}
                    onClick={handleSubmit}
                    className="h-12 w-full gap-3 px-6 sm:w-auto sm:px-10"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                    <span>{isLoading ? 'Publishing...' : 'Publish Market'}</span>
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="continue"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <Button
                    disabled={!isStepValid}
                    onClick={() => setStepIndex((prev) => prev + 1)}
                    className="h-12 w-full px-6 sm:w-auto sm:px-10"
                  >
                    <span>Next Sequence</span>
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
