'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import Link from 'next/link';
import { useChainId } from 'wagmi';
import Button from '@/components/ui/Button';
import useCreateMarket from '@/hooks/useCreateMarket';
import { getContractAddresses, NATIVE_ETH_ADDRESS } from '@/lib/contracts';
import clsx from 'clsx';
import type { MarketType } from '@/types/market';
import type { Address } from 'viem';

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
  const { createMarket, data, error, isError, isLoading } = useCreateMarket();
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [marketType, setMarketType] = useState<MarketType>('BINARY');
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [title, setTitle] = useState<string>('Will ETH settle above $4,000 by June 30?');
  const [description, setDescription] = useState<string>(
    'Resolves against the official June 30 daily close using a single published settlement source.',
  );
  const [oracleSource, setOracleSource] = useState<string>('https://example.com/eth-june-settlement');
  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO']);
  const [expiryTime, setExpiryTime] = useState<string>('2026-06-30T16:00');
  const [minimumTrade, setMinimumTrade] = useState<string>('0.01');
  const [seedLiquidity, setSeedLiquidity] = useState<string>('250');
  const [collateralToken, setCollateralToken] = useState<Address>(NATIVE_ETH_ADDRESS);

  const collateralOptions = useMemo(
    () => [
      { label: 'ETH', value: NATIVE_ETH_ADDRESS },
      ...(addresses?.usdc ? [{ label: 'USDC', value: addresses.usdc }] : []),
    ],
    [addresses?.usdc],
  );

  const handleAddOutcome = (): void => {
    setOutcomes((current) => [...current, `Outcome ${current.length + 1}`]);
  };

  const handleRemoveOutcome = (index: number): void => {
    if (outcomes.length <= 2) {
      return;
    }

    setOutcomes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateOutcome = (index: number, value: string): void => {
    setOutcomes((current) => current.map((outcome, currentIndex) => (currentIndex === index ? value : outcome)));
  };

  const handleTypeChange = (nextType: MarketType): void => {
    setMarketType(nextType);

    if (nextType === 'BINARY') {
      setOutcomes(['YES', 'NO']);
    } else if (outcomes.length < 2) {
      setOutcomes(['Outcome A', 'Outcome B']);
    }
  };

  const handleSubmit = async (): Promise<void> => {
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
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-12 text-center space-y-6 max-w-2xl mx-auto"
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/20 p-6 text-primary ring-8 ring-primary/10">
            <CheckCircle2 className="h-12 w-12" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight text-foreground">Market Created</h2>
          <p className="text-muted-foreground">
            Your singleton-managed share market is now live on-chain.
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tx: {data.txHash.slice(0, 10)}...
          </p>
        </div>
        <div className="pt-4 flex justify-center gap-4">
          <Button variant="outline" onClick={() => window.location.reload()} type="button">
            Create Another
          </Button>
          <Link href="/dashboard">
            <Button className="gap-2">
              View Markets
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <div className={clsx('space-y-10', className)}>
      <div className="relative flex justify-between items-center max-w-2xl mx-auto px-4">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/5 -translate-y-1/2" />
        <div
          className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500"
          style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }}
        />
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < stepIndex;
          const isActive = index === stepIndex;

          return (
            <div key={step.id} className="relative z-10 flex flex-col items-center gap-3">
              <div
                className={clsx(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isActive
                      ? 'bg-card border-primary text-primary shadow-[0_0_20px_rgba(170,58,49,0.2)]'
                      : 'bg-card border-white/10 text-muted-foreground',
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={clsx(
                  'text-[10px] font-black uppercase tracking-widest transition-colors duration-300',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <motion.div
        key={STEPS[stepIndex].id}
        className="glass-card rounded-3xl p-8 max-w-2xl mx-auto"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="space-y-8">
          {stepIndex === 0 ? (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Select Market Type
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    {
                      type: 'BINARY' as const,
                      title: 'Binary',
                      description: 'Two outcomes (Yes/No). Ideal for simple predictions.',
                    },
                    {
                      type: 'CATEGORICAL' as const,
                      title: 'Categorical',
                      description: 'Multiple custom outcomes for elections, sports, or rankings.',
                    },
                  ]).map((option) => (
                    <button
                      key={option.type}
                      className={clsx(
                        'flex flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all',
                        marketType === option.type
                          ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(170,58,49,0.12)]'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10',
                      )}
                      onClick={() => handleTypeChange(option.type)}
                      type="button"
                    >
                      <div
                        className={clsx(
                          'rounded-full p-2',
                          marketType === option.type
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white/10 text-muted-foreground',
                        )}
                      >
                        {option.type === 'BINARY' ? (
                          <FlaskConical className="h-5 w-5" />
                        ) : (
                          <ListChecks className="h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-foreground">{option.title}</p>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Market Title
                  </label>
                  <input
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="What is being predicted?"
                    value={title}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Description
                  </label>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-medium text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="State the exact settlement condition and any important caveats."
                    value={description}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Category
                  </label>
                  <select
                    className="h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                    Define Outcomes
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {marketType === 'BINARY'
                      ? 'Binary markets use locked YES / NO outcomes.'
                      : 'Add every valid market outcome.'}
                  </p>
                </div>
                {marketType === 'CATEGORICAL' ? (
                  <Button className="gap-2" onClick={handleAddOutcome} size="sm" type="button" variant="outline">
                    <Plus className="h-3 w-3" />
                    Add Outcome
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4">
                {outcomes.map((outcome, index) => (
                  <div key={`outcome-${index}`} className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        className={clsx(
                          'h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all',
                          marketType === 'BINARY'
                            ? 'bg-white/[0.05] cursor-not-allowed pr-10'
                            : 'focus:border-primary/50 focus:ring-4 focus:ring-primary/10',
                        )}
                        disabled={marketType === 'BINARY'}
                        onChange={(event) => updateOutcome(index, event.target.value)}
                        placeholder={`Outcome ${index + 1}`}
                        value={outcome}
                      />
                      {marketType === 'BINARY' ? (
                        <Lock className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      ) : null}
                    </div>
                    {marketType === 'CATEGORICAL' && outcomes.length > 2 ? (
                      <button
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        onClick={() => handleRemoveOutcome(index)}
                        type="button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Expiry Date & Time
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setExpiryTime(event.target.value)}
                  type="datetime-local"
                  value={expiryTime}
                />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Collateral
                </label>
                <select
                  className="h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setCollateralToken(event.target.value as Address)}
                  value={collateralToken}
                >
                  {collateralOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Oracle Source
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setOracleSource(event.target.value)}
                  placeholder="https://publisher.example/settlement-source"
                  value={oracleSource}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Minimum Trade
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setMinimumTrade(event.target.value)}
                  placeholder="0.01"
                  value={minimumTrade}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  Total Seed Liquidity
                </label>
                <input
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                  onChange={(event) => setSeedLiquidity(event.target.value)}
                  placeholder="250"
                  value={seedLiquidity}
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Enter the total deposit. CipherMarket splits it evenly across every outcome to
                  initialize the pool.
                </p>
              </div>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-6">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <p className="text-xs font-black uppercase tracking-widest text-primary">Final Review</p>
              </div>
              <div className="grid gap-6 text-sm">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</p>
                    <p className="font-bold text-foreground">{title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Oracle Source</p>
                    <p className="font-bold text-foreground break-all">{oracleSource}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type & Category</p>
                    <p className="font-bold text-foreground">{marketType} · {category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Collateral</p>
                    <p className="font-bold text-foreground">
                      {collateralOptions.find((option) => option.value === collateralToken)?.label ?? 'ETH'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Minimum Trade</p>
                    <p className="font-bold text-foreground">{minimumTrade}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Seed Liquidity</p>
                    <p className="font-bold text-foreground">{seedLiquidity}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</p>
                  <p className="text-sm text-foreground">{description}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outcomes</p>
                  <p className="font-bold text-foreground">{outcomes.join(' / ')}</p>
                </div>
              </div>
            </div>
          ) : null}

          {isError && error ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-bold text-destructive">
              {error.message}
            </div>
          ) : null}

          <div className="flex justify-between border-t border-white/5 pt-6">
            <Button
              className="gap-2"
              disabled={stepIndex === 0 || isLoading}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              type="button"
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
            {stepIndex === STEPS.length - 1 ? (
              <Button className="gap-2" disabled={isLoading} onClick={handleSubmit} type="button">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isLoading ? 'Deploying...' : 'Deploy Market'}
              </Button>
            ) : (
              <Button
                className="gap-2"
                disabled={isLoading}
                onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                type="button"
              >
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
