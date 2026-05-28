import type { Hex } from 'viem';

export const ZERO_CT_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

export function normalizeCtHash(value: unknown): Hex {
  if (typeof value === 'bigint') {
    return `0x${value.toString(16).padStart(64, '0')}` as Hex;
  }

  if (typeof value === 'string' && value.startsWith('0x')) {
    return value as Hex;
  }

  return ZERO_CT_HASH;
}

export function isZeroCtHash(value: unknown): boolean {
  return normalizeCtHash(value) === ZERO_CT_HASH;
}
