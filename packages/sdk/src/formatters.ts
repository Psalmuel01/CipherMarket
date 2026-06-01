import { formatUnits } from 'viem';

export function truncateAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatAmount(value: bigint, decimals = 3): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(value, decimals)));
}

export function formatTokenAmount(value: bigint, decimals: number, symbol: string): string {
  return `${formatAmount(value, decimals)} ${symbol}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatRelativeExpiry(value: string): string {
  const delta = new Date(value).getTime() - Date.now();

  if (delta <= 0) {
    return 'expired';
  }

  const hours = Math.floor(delta / (1000 * 60 * 60));

  if (hours < 24) {
    return `in ${hours}h`;
  }

  return `in ${Math.floor(hours / 24)}d`;
}
