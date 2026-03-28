'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, CheckCircle2, FlaskConical, ListChecks, Settings2, FileCheck2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import clsx from 'clsx';

const STEPS = [
  { id: 'Type', icon: FlaskConical, label: 'Market Type' },
  { id: 'Outcomes', icon: ListChecks, label: 'Outcomes' },
  { id: 'Config', icon: Settings2, label: 'Configure' },
  { id: 'Confirm', icon: FileCheck2, label: 'Verify' },
] as const;

export interface CreateMarketFormProps {
  className?: string;
}

export default function CreateMarketForm({ className }: CreateMarketFormProps): JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);

  return (
    <div className={clsx('space-y-10', className)}>
      {/* Progress Bar */}
      <div className="relative flex justify-between items-center max-w-2xl">
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
          className="glass-card rounded-3xl p-8"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <div className="space-y-8">
            {stepIndex === 0 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Market Type</label>
                  <select className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10">
                    <option className="bg-background">Binary market</option>
                    <option className="bg-background">Categorical market</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Category</label>
                  <input
                    placeholder="e.g. Macro, Crypto, Tech"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="Macro"
                  />
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Outcome A</label>
                  <input
                    placeholder="e.g. Yes"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="YES"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Outcome B</label>
                  <input
                    placeholder="e.g. No"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="NO"
                  />
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Expiry Date & Time</label>
                  <input
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
                    defaultValue="2026-06-30T16:00"
                    type="datetime-local"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-bold text-foreground">Resolution Source</label>
                  <input
                    placeholder="e.g. Official API, News Report"
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
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
                <div className="grid gap-6 text-sm md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Title</p>
                    <p className="font-semibold text-foreground">Will ETH settle above $4,000 by June 30?</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outcomes</p>
                    <p className="font-semibold text-foreground">YES / NO</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Oracle Strategy</p>
                    <p className="font-semibold text-foreground">Optimistic + 24h Dispute Window</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Settlement</p>
                    <p className="font-semibold text-foreground">Fhenix Confidential Tokens</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <Button
                disabled={stepIndex === 0}
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                type="button"
                variant="outline"
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Step
              </Button>
              <Button
                onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
                type="button"
                className="gap-2"
              >
                {stepIndex === STEPS.length - 1 ? 'Deploy Contract' : 'Next Step'}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

