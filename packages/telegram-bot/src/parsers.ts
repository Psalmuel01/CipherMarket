import { parseUnits } from 'viem';

export function parseMarketId(value: string | undefined): number {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 0) {
    throw new Error('Use a valid market id.');
  }
  return id;
}

export function parseOutcomeIndex(value: string | undefined): number {
  if (!value) {
    throw new Error('Use YES, NO, or an outcome number.');
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes' || normalized === 'up') return 0;
  if (normalized === 'no' || normalized === 'down') return 1;

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Use YES, NO, or an outcome number.');
  }
  return parsed;
}

export function parseTokenAmount(value: string | undefined, decimals: number): bigint {
  if (!value) {
    throw new Error('Enter an amount.');
  }

  const trimmed = value.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error('Use a positive numeric amount.');
  }

  const parsed = parseUnits(trimmed, decimals);
  if (parsed <= 0n) {
    throw new Error('Amount must be greater than zero.');
  }

  return parsed;
}
