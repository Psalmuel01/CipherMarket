'use client';

import { useState } from 'react';
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
  ShieldCheck, 
  Plus, 
  Trash2,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useDemoFlow } from '@/hooks/useDemoFlow';
import clsx from 'clsx';

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
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { setCreatedMarket } = useDemoFlow();

  // Form State
  const [marketType, setMarketType] = useState<'binary' | 'categorical'>('binary');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [title, setTitle] = useState('Will ETH settle above $4,000 by June 30?');
  const [description, setDescription] = useState('This market settles based on the Coingecko ETH/USD closing price on June 30, 2026.');
  const [outcomes, setOutcomes] = useState<string[]>(['YES', 'NO']);

  const handleDeploy = async () => {
    setIsDeploying(true);
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDeploying(false);
    setIsSuccess(true);
    setCreatedMarket(true);
  };

  const handleAddOutcome = () => {
    setOutcomes([...outcomes, `Outcome ${outcomes.length + 1}`]);
  };

  const handleRemoveOutcome = (index: number) => {
    if (outcomes.length > 2) {
      setOutcomes(outcomes.filter((_, i) => i !== index));
    }
  };

  const updateOutcome = (index: number, value: string) => {
    const newOutcomes = [...outcomes];
    newOutcomes[index] = value;
    setOutcomes(newOutcomes);
  };

  const handleTypeChange = (type: 'binary' | 'categorical') => {
    setMarketType(type);
    if (type === 'binary') {
      setOutcomes(['YES', 'NO']);
    } else if (outcomes.length < 2) {
      setOutcomes(['Outcome A', 'Outcome B']);
    }
  };

  if (isSuccess) {
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
          <p className="text-muted-foreground">Your confidential prediction market is now live on the Fhenix testnet.</p>
        </div>
        <div className="pt-4 flex justify-center gap-4">
          <Button variant="outline" onClick={() => setIsSuccess(false)}>Create Another</Button>
          <Link href="/">
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
      {/* Progress Bar */}
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
                  isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                  isActive ? 'bg-card border-primary text-primary shadow-[0_0_20px_rgba(79,255,212,0.3)]' :
                  'bg-card border-white/10 text-muted-foreground'
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span className={clsx(
                'text-[10px] font-black uppercase tracking-widest transition-colors duration-300',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={STEPS[stepIndex].id}
          className="glass-card rounded-3xl p-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="space-y-8">
            {stepIndex === 0 && (
              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Select Market Type</label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      onClick={() => handleTypeChange('binary')}
                      className={clsx(
                        "flex flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all",
                        marketType === 'binary' 
                          ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(79,255,212,0.1)]" 
                          : "border-white/5 bg-white/[0.02] hover:border-white/10"
                      )}
                    >
                      <div className={clsx(
                        "rounded-full p-2",
                        marketType === 'binary' ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"
                      )}>
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-foreground">Binary</p>
                        <p className="text-xs text-muted-foreground">Two outcomes (Yes/No). Ideal for simple predictions.</p>
                      </div>
                    </button>
                    <button
                      onClick={() => handleTypeChange('categorical')}
                      className={clsx(
                        "flex flex-col items-start gap-3 rounded-2xl border-2 p-6 text-left transition-all",
                        marketType === 'categorical' 
                          ? "border-primary bg-primary/5 shadow-[0_0_20px_rgba(79,255,212,0.1)]" 
                          : "border-white/5 bg-white/[0.02] hover:border-white/10"
                      )}
                    >
                      <div className={clsx(
                        "rounded-full p-2",
                        marketType === 'categorical' ? "bg-primary text-primary-foreground" : "bg-white/10 text-muted-foreground"
                      )}>
                        <ListChecks className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-black text-foreground">Categorical</p>
                        <p className="text-xs text-muted-foreground">Multiple custom outcomes. Perfect for elections or sports.</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-">
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Market Title</label>
                    <input
                      placeholder="What is being predicted?"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Category</label>
                    <select 
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-12 w-full rounded-2xl border border-white/10 bg-background px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Define Outcomes</label>
                    <p className="text-xs text-muted-foreground">
                      {marketType === 'binary' ? 'Binary markets use locked placeholders.' : 'Add all possible resulting outcomes.'}
                    </p>
                  </div>
                  {marketType === 'categorical' && (
                    <Button variant="outline" size="sm" onClick={handleAddOutcome} className="gap-2">
                      <Plus className="h-3 w-3" />
                      Add Outcome
                    </Button>
                  )}
                </div>

                <div className="grid gap-4">
                  {outcomes.map((outcome, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          disabled={marketType === 'binary'}
                          placeholder={`Outcome ${index + 1}`}
                          value={outcome}
                          onChange={(e) => updateOutcome(index, e.target.value)}
                          className={clsx(
                            "h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all",
                            marketType === 'binary' ? "bg-white/[0.05] cursor-not-allowed pr-10" : "focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                          )}
                        />
                        {marketType === 'binary' && (
                          <Lock className="absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                        )}
                      </div>
                      {marketType === 'categorical' && outcomes.length > 2 && (
                        <button 
                          onClick={() => handleRemoveOutcome(index)}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Expiry Date & Time</label>
                  <input
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="2026-06-30T16:00"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black uppercase tracking-widest text-muted-foreground">Resolution Source</label>
                  <input
                    placeholder="e.g. Official API, News Report"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.02] px-4 text-sm font-bold text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="Official issuer report"
                  />
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-xs font-black uppercase tracking-widest text-primary">
                    Final Review
                  </p>
                </div>
                <div className="grid gap-6 text-sm">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Title</p>
                      <p className="font-bold text-foreground">{title}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type & Category</p>
                      <p className="font-bold text-foreground uppercase tracking-wider text-xs">
                        {marketType} • {category}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</p>
                    <p className="font-bold text-foreground text-xs leading-relaxed line-clamp-2">{description}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Outcomes</p>
                    <div className="flex flex-wrap gap-2">
                      {outcomes.map((o, i) => (
                        <span key={i} className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-bold text-primary border border-primary/20">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-white/5">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Oracle Strategy</p>
                      <p className="font-bold text-foreground">Optimistic + 24h Dispute</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Settlement</p>
                      <p className="font-bold text-foreground">Fhenix Confidential Tokens</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <Button
                disabled={stepIndex === 0 || isDeploying}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                type="button"
                variant="outline"
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Step
              </Button>
              <Button
                disabled={isDeploying}
                onClick={stepIndex === STEPS.length - 1 ? handleDeploy : () => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                type="button"
                className="gap-2"
              >
                {stepIndex === STEPS.length - 1 ? (isDeploying ? 'Creating...' : 'Create Market') : 'Next Step'}
                {stepIndex === STEPS.length - 1 ? (isDeploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />) : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

