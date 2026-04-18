'use client';

import { CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { MarketOutcome } from '@/types/market';
import clsx from 'clsx';

export interface OutcomeSelectorProps {
  outcomes: MarketOutcome[];
  selectedOutcomeId: string;
  onSelect: (outcomeId: string) => void;
}

export default function OutcomeSelector({
  onSelect,
  outcomes,
  selectedOutcomeId,
}: OutcomeSelectorProps): JSX.Element {
  return (
    <div className="grid gap-4">
      {outcomes.map((outcome) => {
        const isSelected = selectedOutcomeId === outcome.id;
        
        return (
          <button
            key={outcome.id}
            onClick={() => onSelect(outcome.id)}
            className={clsx(
              "flex items-center justify-between rounded-2xl border-2 px-6 py-4 transition-all duration-300",
              isSelected 
                ? "border-primary bg-primary/10 shadow-[0_0_20px_rgba(170,58,49,0.14)]"
                : "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={clsx(
                "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-white/20"
              )}>
                {isSelected && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <span className={clsx(
                "text-base font-black uppercase tracking-widest",
                isSelected ? "text-foreground" : "text-muted-foreground"
              )}>
                {outcome.label}
              </span>
            </div>
            <div className={clsx(
              "text-sm font-black transition-colors",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}>
              {outcome.impliedShare}%
            </div>
          </button>
        );
      })}
    </div>
  );
}
