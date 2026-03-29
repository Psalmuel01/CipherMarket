import { formatUnits } from 'viem';

/**
 * Truncates a wallet address for compact terminal-style display.
 * @param address The address to truncate.
 * @returns A shortened address string.
 */
export function truncateAddress(address: string): string {
  if (address.length < 12) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Formats a bigint-denominated token amount for compact display.
 * @param value The amount to format.
 * @param decimals The token decimals.
 * @returns A localized string representation.
 */
export function formatAmount(value: bigint, decimals = 3): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(value, decimals)));
}

/**
 * Formats a token amount together with its symbol.
 * @param value The raw amount.
 * @param decimals The token decimals.
 * @param symbol The token symbol.
 * @returns A token string such as "12.5 ETH".
 */
export function formatTokenAmount(value: bigint, decimals: number, symbol: string): string {
  return `${formatAmount(value, decimals)} ${symbol}`;
}

/**
 * Formats an ISO timestamp as a concise UTC date-time string.
 * @param value The ISO date string.
 * @returns The formatted date string.
 */
export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value));
}

/**
 * Converts an ISO timestamp into a relative expiry label.
 * @param value The ISO date string.
 * @returns A relative label such as "in 2d" or "expired".
 */
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
