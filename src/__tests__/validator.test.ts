import { validateRawRow } from '../validators/transaction.validator';
import { RawCsvRow } from '../types';

function makeValidRow(overrides: Partial<RawCsvRow> = {}): RawCsvRow {
  return {
    transaction_id: 'USR-001',
    timestamp: '2024-03-01T09:00:00Z',
    type: 'BUY',
    asset: 'BTC',
    quantity: '0.5',
    price_usd: '62000.00',
    fee: '0.0005',
    note: 'Test',
    ...overrides,
  };
}

describe('validateRawRow', () => {
  it('passes a valid row', () => {
    const result = validateRawRow(makeValidRow(), 2);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when transaction_id is missing', () => {
    const result = validateRawRow(makeValidRow({ transaction_id: '' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('transaction_id'))).toBe(true);
  });

  it('fails when timestamp is missing', () => {
    const result = validateRawRow(makeValidRow({ timestamp: '' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('timestamp'))).toBe(true);
  });

  it('fails when timestamp is malformed', () => {
    const result = validateRawRow(makeValidRow({ timestamp: '2024-03-09T' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Malformed timestamp'))).toBe(true);
  });

  it('fails when quantity is negative', () => {
    const result = validateRawRow(makeValidRow({ quantity: '-0.1' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Negative quantity'))).toBe(true);
  });

  it('fails when quantity is missing', () => {
    const result = validateRawRow(makeValidRow({ quantity: '' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('quantity'))).toBe(true);
  });

  it('fails when asset is missing', () => {
    const result = validateRawRow(makeValidRow({ asset: '' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('asset'))).toBe(true);
  });

  it('fails when type is missing', () => {
    const result = validateRawRow(makeValidRow({ type: '' }), 2);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('type'))).toBe(true);
  });

  it('passes when optional fields are missing', () => {
    const result = validateRawRow(
      makeValidRow({ price_usd: '', fee: '', note: '' }),
      2,
    );
    expect(result.valid).toBe(true);
  });

  it('collects multiple errors', () => {
    const result = validateRawRow(
      { transaction_id: '', timestamp: '', type: '', asset: '', quantity: '' },
      2,
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
