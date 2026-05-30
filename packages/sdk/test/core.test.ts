import { describe, expect, it } from 'vitest';
import {
  computeProbabilitiesFromReserves,
  formatTokenAmount,
  isZeroCtHash,
  normalizeCtHash,
  normalizeQuoteResult,
} from '../src';

describe('@ciphermarket/sdk core helpers', () => {
  it('computes balanced probabilities from equal reserves', () => {
    expect(computeProbabilitiesFromReserves([100n, 100n])).toEqual([
      500000000000000000n,
      500000000000000000n,
    ]);
  });

  it('formats token amounts with the expected symbol', () => {
    expect(formatTokenAmount(1_500_000n, 6, 'USDC')).toBe('1.5 USDC');
  });

  it('normalizes encrypted handles', () => {
    expect(normalizeCtHash(1n)).toBe(
      '0x0000000000000000000000000000000000000000000000000000000000000001',
    );
    expect(isZeroCtHash(null)).toBe(true);
  });

  it('normalizes buy quote results', () => {
    const quote = normalizeQuoteResult(
      [10n, 1n, 500000000000000000n, [600000000000000000n, 400000000000000000n]],
      {
        side: 'BUY',
        outcomeIndex: 0,
        amount: 5n,
      },
    );

    expect(quote.collateralAmount).toBe(5n);
    expect(quote.sharesAmount).toBe(10n);
    expect(quote.feeAmount).toBe(1n);
    expect(quote.slippageBps).toBe(1666);
  });
});
