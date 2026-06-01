import { describe, expect, it } from 'vitest';
import { marketLink } from './links.js';
import { parseMarketId, parseOutcomeIndex, parseTokenAmount } from './parsers.js';

describe('telegram bot parsers', () => {
  it('parses market ids', () => {
    expect(parseMarketId('3')).toBe(3);
    expect(() => parseMarketId('-1')).toThrow();
  });

  it('parses outcome labels and indexes', () => {
    expect(parseOutcomeIndex('YES')).toBe(0);
    expect(parseOutcomeIndex('NO')).toBe(1);
    expect(parseOutcomeIndex('2')).toBe(2);
  });

  it('parses token amounts', () => {
    expect(parseTokenAmount('1.5', 6)).toBe(1_500_000n);
    expect(() => parseTokenAmount('abc', 6)).toThrow();
  });

  it('builds market action links', () => {
    expect(marketLink('https://cipher.example', 7, { action: 'buy', outcomeIndex: 1 })).toBe(
      'https://cipher.example/markets/7?action=buy&outcome=1',
    );
  });
});
