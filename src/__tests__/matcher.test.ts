import { matchTransaction } from '../reconciliation/matcher';
import {
  ReconciliationStatus,
  NormalizedAsset,
  NormalizedTransactionType,
  TransactionSource,
  ConflictReason,
} from '../types';
import { INormalizedTransaction } from '../models/NormalizedTransaction';
import mongoose from 'mongoose';

function makeTx(
  overrides: Partial<INormalizedTransaction> = {},
): INormalizedTransaction {
  return {
    _id: new mongoose.Types.ObjectId(),
    transactionId: 'TX-001',
    source: TransactionSource.USER,
    timestamp: new Date('2024-03-01T09:00:00Z'),
    type: NormalizedTransactionType.BUY,
    asset: NormalizedAsset.BTC,
    rawAsset: 'BTC',
    rawType: 'BUY',
    quantity: 0.5,
    priceUsd: 62000,
    fee: 0.0005,
    note: '',
    rawTransactionId: new mongoose.Types.ObjectId(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as INormalizedTransaction;
}

const defaultConfig = {
  timestampToleranceSeconds: 300,
  quantityTolerancePct: 0.01,
};

describe('matchTransaction', () => {
  it('returns UNMATCHED_USER when no candidates available', () => {
    const userTx = makeTx();
    const result = matchTransaction(userTx, [], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.UNMATCHED_USER);
    expect(result.exchangeTx).toBeNull();
  });

  it('matches by exact transaction ID', () => {
    const userTx = makeTx({ transactionId: 'USR-001', source: TransactionSource.USER });
    const exchangeTx = makeTx({
      transactionId: 'USR-001',
      source: TransactionSource.EXCHANGE,
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.MATCHED);
    expect(result.candidate?.matchMethod).toBe('exact_id');
    expect(result.candidate?.confidenceScore).toBe(100);
  });

  it('matches by exact fields when timestamps are within 1 second', () => {
    const userTx = makeTx({ transactionId: 'USR-001' });
    const exchangeTx = makeTx({
      transactionId: 'EXC-1001',
      timestamp: new Date('2024-03-01T09:00:00Z'), // same time
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.MATCHED);
    expect(result.candidate?.matchMethod).toBe('exact_fields');
  });

  it('matches within tolerance window', () => {
    const userTx = makeTx({ transactionId: 'USR-001' });
    const exchangeTx = makeTx({
      transactionId: 'EXC-1001',
      timestamp: new Date('2024-03-01T09:04:00Z'), // 240s later, within 300s
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.MATCHED);
    expect(result.candidate?.matchMethod).toBe('tolerance');
  });

  it('returns CONFLICTING when timestamp exceeds tolerance', () => {
    const userTx = makeTx({ transactionId: 'USR-001' });
    const exchangeTx = makeTx({
      transactionId: 'EXC-1001',
      timestamp: new Date('2024-03-01T10:00:00Z'), // 3600s later
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.CONFLICTING);
    expect(result.conflictReasons).toContain(ConflictReason.TIMESTAMP_OUT_OF_RANGE);
  });

  it('returns CONFLICTING when quantity exceeds tolerance', () => {
    const userTx = makeTx({ transactionId: 'USR-001', quantity: 0.5 });
    const exchangeTx = makeTx({
      transactionId: 'EXC-1001',
      quantity: 0.6, // 20% difference
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.CONFLICTING);
    expect(result.conflictReasons).toContain(ConflictReason.QUANTITY_MISMATCH);
  });

  it('skips already-used exchange transactions', () => {
    const userTx = makeTx({ transactionId: 'USR-001' });
    const exchangeTx = makeTx({ transactionId: 'EXC-1001' });
    const usedIds = new Set(['EXC-1001']);

    const result = matchTransaction(userTx, [exchangeTx], usedIds, defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.UNMATCHED_USER);
  });

  it('matches TRANSFER_OUT (user) with TRANSFER_IN (exchange)', () => {
    const userTx = makeTx({
      transactionId: 'USR-004',
      type: NormalizedTransactionType.TRANSFER_OUT,
    });
    const exchangeTx = makeTx({
      transactionId: 'EXC-1004',
      type: NormalizedTransactionType.TRANSFER_IN,
    });

    const result = matchTransaction(userTx, [exchangeTx], new Set(), defaultConfig);
    expect(result.status).toBe(ReconciliationStatus.MATCHED);
  });

  it('prevents duplicate pairing — second user tx gets UNMATCHED', () => {
    const userTx1 = makeTx({ transactionId: 'USR-001' });
    const userTx2 = makeTx({ transactionId: 'USR-002' });
    const exchangeTx = makeTx({ transactionId: 'EXC-1001' });

    const usedIds = new Set<string>();

    const result1 = matchTransaction(userTx1, [exchangeTx], usedIds, defaultConfig);
    expect(result1.status).toBe(ReconciliationStatus.MATCHED);
    usedIds.add(result1.candidate!.exchangeTxId);

    const result2 = matchTransaction(userTx2, [exchangeTx], usedIds, defaultConfig);
    expect(result2.status).toBe(ReconciliationStatus.UNMATCHED_USER);
  });
});
