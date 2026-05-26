import {
  normalizeAsset,
  normalizeType,
  parseTimestamp,
  parseNumber,
  quantityDeltaPct,
  timeDeltaSeconds,
} from '../utils/normalizer';
import { NormalizedAsset, NormalizedTransactionType } from '../types';

describe('normalizeAsset', () => {
  it('normalizes BTC variants', () => {
    expect(normalizeAsset('BTC')).toBe(NormalizedAsset.BTC);
    expect(normalizeAsset('btc')).toBe(NormalizedAsset.BTC);
    expect(normalizeAsset('bitcoin')).toBe(NormalizedAsset.BTC);
    expect(normalizeAsset('Bitcoin')).toBe(NormalizedAsset.BTC);
    expect(normalizeAsset('XBT')).toBe(NormalizedAsset.BTC);
  });

  it('normalizes ETH variants', () => {
    expect(normalizeAsset('ETH')).toBe(NormalizedAsset.ETH);
    expect(normalizeAsset('ethereum')).toBe(NormalizedAsset.ETH);
  });

  it('normalizes SOL', () => {
    expect(normalizeAsset('SOL')).toBe(NormalizedAsset.SOL);
    expect(normalizeAsset('solana')).toBe(NormalizedAsset.SOL);
  });

  it('returns UNKNOWN for unrecognized assets', () => {
    expect(normalizeAsset('DOGE')).toBe(NormalizedAsset.UNKNOWN);
    expect(normalizeAsset('')).toBe(NormalizedAsset.UNKNOWN);
    expect(normalizeAsset('   ')).toBe(NormalizedAsset.UNKNOWN);
  });
});

describe('normalizeType', () => {
  it('normalizes BUY variants', () => {
    expect(normalizeType('BUY')).toBe(NormalizedTransactionType.BUY);
    expect(normalizeType('buy')).toBe(NormalizedTransactionType.BUY);
    expect(normalizeType('PURCHASE')).toBe(NormalizedTransactionType.BUY);
  });

  it('normalizes SELL variants', () => {
    expect(normalizeType('SELL')).toBe(NormalizedTransactionType.SELL);
    expect(normalizeType('dispose')).toBe(NormalizedTransactionType.SELL);
    expect(normalizeType('SALE')).toBe(NormalizedTransactionType.SELL);
  });

  it('normalizes TRANSFER types', () => {
    expect(normalizeType('TRANSFER_IN')).toBe(NormalizedTransactionType.TRANSFER_IN);
    expect(normalizeType('TRANSFER_OUT')).toBe(NormalizedTransactionType.TRANSFER_OUT);
    expect(normalizeType('deposit')).toBe(NormalizedTransactionType.TRANSFER_IN);
    expect(normalizeType('withdrawal')).toBe(NormalizedTransactionType.TRANSFER_OUT);
  });

  it('returns UNKNOWN for unrecognized types', () => {
    expect(normalizeType('SWAP')).toBe(NormalizedTransactionType.UNKNOWN);
    expect(normalizeType('')).toBe(NormalizedTransactionType.UNKNOWN);
  });
});

describe('parseTimestamp', () => {
  it('parses valid ISO 8601 timestamps', () => {
    const result = parseTimestamp('2024-03-01T09:00:00Z');
    expect(result).toBeInstanceOf(Date);
    expect(result!.toISOString()).toBe('2024-03-01T09:00:00.000Z');
  });

  it('returns null for empty string', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp(undefined)).toBeNull();
  });

  it('returns null for malformed timestamps', () => {
    expect(parseTimestamp('2024-03-09T')).toBeNull();
    expect(parseTimestamp('not-a-date')).toBeNull();
  });

  it('handles timestamps without Z suffix', () => {
    const result = parseTimestamp('2024-03-01T09:00:00');
    expect(result).toBeInstanceOf(Date);
  });
});

describe('parseNumber', () => {
  it('parses valid numbers', () => {
    expect(parseNumber('0.5')).toBe(0.5);
    expect(parseNumber('62000.00')).toBe(62000);
    expect(parseNumber('0')).toBe(0);
  });

  it('returns null for empty/missing values', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber('  ')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1.2.3')).toBeNull();
  });

  it('parses negative numbers', () => {
    expect(parseNumber('-0.1')).toBe(-0.1);
  });
});

describe('quantityDeltaPct', () => {
  it('returns 0 for identical values', () => {
    expect(quantityDeltaPct(0.5, 0.5)).toBe(0);
  });

  it('calculates percentage difference correctly', () => {
    expect(quantityDeltaPct(0.3001, 0.3)).toBeCloseTo(0.0333, 3);
  });

  it('returns Infinity when reference is 0 and values differ', () => {
    expect(quantityDeltaPct(1, 0)).toBe(Infinity);
  });

  it('returns 0 when both values are 0', () => {
    expect(quantityDeltaPct(0, 0)).toBe(0);
  });
});

describe('timeDeltaSeconds', () => {
  it('calculates time difference in seconds', () => {
    const a = new Date('2024-03-01T09:00:00Z');
    const b = new Date('2024-03-01T09:05:00Z');
    expect(timeDeltaSeconds(a, b)).toBe(300);
  });

  it('returns absolute value (order independent)', () => {
    const a = new Date('2024-03-01T09:05:00Z');
    const b = new Date('2024-03-01T09:00:00Z');
    expect(timeDeltaSeconds(a, b)).toBe(300);
  });

  it('returns 0 for identical timestamps', () => {
    const a = new Date('2024-03-01T09:00:00Z');
    expect(timeDeltaSeconds(a, a)).toBe(0);
  });
});
