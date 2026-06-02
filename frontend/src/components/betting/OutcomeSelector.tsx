'use client';

import { CheckCircle2 } from 'lucide-react';
import type { MarketOutcome } from '@/types/market';
import clsx from 'clsx';
import { getOutcomeColor } from '@/lib/outcomeColors';
import { formatTokenAmount } from '@/lib/formatters';

export interface OutcomeSelectorProps {
  outcomes: MarketOutcome[];
  selectedOutcomeId: string;
  onSelect: (outcomeId: string) => void;
  disabled?: boolean;
  collateralDecimals?: number;
  collateralSymbol?: string;
}

function formatOutcomePercent(value: bigint): string {
  const percent = Number(value) / 1e16;
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(percent);
}

export default function OutcomeSelector({
  collateralDecimals = 18,
  collateralSymbol = 'reserve',
  onSelect,
  outcomes,
  selectedOutcomeId,
  disabled = false,
}: OutcomeSelectorProps): JSX.Element {
  return (
    <div className="grid gap-4">
      {outcomes.map((outcome) => {
        const isSelected = !disabled && selectedOutcomeId === outcome.id;
        const color = getOutcomeColor(outcome.outcomeIndex);

        return (
          <button
            key={outcome.id}
            onClick={() => !disabled && onSelect(outcome.id)}
            disabled={disabled}
            className={clsx(
              'min-h-24 rounded-2xl border-2 px-4 py-5 text-left transition-all duration-300 sm:px-6',
              disabled
                ? 'cursor-not-allowed opacity-50 border-white/5 bg-white/[0.02]'
                : isSelected
                  ? 'bg-white/[0.035]'
                  : 'border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
            )}
            style={
              isSelected
                ? {
                  borderColor: color.border,
                  boxShadow: `0 0 24px ${color.shadow}`,
                }
                : undefined
            }
            type="button"
          >
            <div className="flex flex-col gap-4 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
              <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                <div
                  className={clsx(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                    isSelected ? 'text-[#05070b]' : 'border-white/20',
                  )}
                  style={
                    isSelected
                      ? {
                        backgroundColor: color.hex,
                        borderColor: color.hex,
                        boxShadow: `0 0 14px ${color.shadow}`,
                      }
                      : undefined
                  }
                >
                  {isSelected ? <CheckCircle2 className="h-4 w-4" /> : null}
                </div>
                <div className="min-w-0 space-y-1">
                  <span
                    className={clsx(
                      'block truncate text-base font-semibold tracking-tight',
                      isSelected ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {outcome.label}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Price {formatOutcomePercent(outcome.price)}%
                  </span>
                </div>
              </div>
              <div className="min-[380px]:text-right">
                <p className="font-mono text-sm" style={{ color: isSelected ? color.text : undefined }}>
                  {formatOutcomePercent(outcome.probability)}%
                </p>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground break-words">
                  Reserve {formatTokenAmount(outcome.reserve, collateralDecimals, collateralSymbol)}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
