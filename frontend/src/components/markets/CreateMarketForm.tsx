'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '@/components/ui/Button';

const STEPS = ['Type', 'Outcomes', 'Config', 'Confirm'] as const;

export interface CreateMarketFormProps {
  className?: string;
}

export default function CreateMarketForm({ className }: CreateMarketFormProps): JSX.Element {
  const [stepIndex, setStepIndex] = useState<number>(0);

  return (
    <div className={className}>
      <div className="mb-6 flex flex-wrap gap-3">
        {STEPS.map((step, index) => (
          <div
            key={step}
            className={`rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] ${
              index === stepIndex
                ? 'border-teal/30 bg-teal/10 text-teal'
                : 'border-line bg-white/[0.02] text-muted'
            }`}
          >
            {step}
          </div>
        ))}
      </div>

      <motion.div
        key={STEPS[stepIndex]}
        className="rounded-2xl border border-line bg-panel/72 p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <div className="space-y-6">
          {stepIndex === 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-muted">
                Market Type
                <select className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text">
                  <option>Binary market</option>
                  <option>Categorical market</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-muted">
                Category
                <input
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
                  defaultValue="Macro"
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 1 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-muted">
                Outcome A
                <input
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
                  defaultValue="YES"
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                Outcome B
                <input
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
                  defaultValue="NO"
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 2 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-muted">
                Expiry
                <input
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
                  defaultValue="2026-06-30T16:00"
                  type="datetime-local"
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                Resolution source
                <input
                  className="w-full rounded-xl border border-line bg-surface px-3 py-3 text-text"
                  defaultValue="Official issuer report"
                />
              </label>
            </div>
          ) : null}

          {stepIndex === 3 ? (
            <div className="rounded-2xl border border-line bg-surface/70 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-teal">
                Ready for deployment
              </p>
              <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
                <p>Title: Will ETH settle above $4,000 by June 30?</p>
                <p>Outcomes: YES / NO</p>
                <p>Oracle path: optimistic + dispute window</p>
                <p>Settlement token: phase-2 binding</p>
              </div>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button
              disabled={stepIndex === 0}
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              type="button"
              variant="ghost"
            >
              Back
            </Button>
            <Button
              onClick={() => setStepIndex((current) => Math.min(STEPS.length - 1, current + 1))}
              type="button"
            >
              {stepIndex === STEPS.length - 1 ? 'Ready for Contracts' : 'Continue'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

