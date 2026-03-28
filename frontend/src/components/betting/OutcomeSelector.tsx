'use client';

import Button from '@/components/ui/Button';
import type { MarketOutcome } from '@/types/market';

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
    <div className="grid gap-3 md:grid-cols-2">
      {outcomes.map((outcome) => (
        <Button
          key={outcome.id}
          className="justify-between"
          onClick={() => onSelect(outcome.id)}
          type="button"
          variant={selectedOutcomeId === outcome.id ? 'primary' : 'ghost'}
        >
          <span>{outcome.label}</span>
          <span className="font-mono text-xs">{outcome.impliedShare}%</span>
        </Button>
      ))}
    </div>
  );
}

