import { resultsToCsv, buildSummary, groupResultsByStatus } from '../reports/reportGenerator';
import { IReconciliationResult } from '../models/ReconciliationResult';
import { IReconciliationRun } from '../models/ReconciliationRun';
import { ReconciliationStatus, RunStatus } from '../types';
import mongoose from 'mongoose';

function makeResult(
  status: ReconciliationStatus,
  overrides: Partial<IReconciliationResult> = {},
): IReconciliationResult {
  return {
    _id: new mongoose.Types.ObjectId(),
    runId: 'run-123',
    status,
    userTransactionId: 'USR-001',
    exchangeTransactionId: 'EXC-1001',
    asset: 'BTC',
    type: 'BUY',
    userTimestamp: new Date('2024-03-01T09:00:00Z'),
    exchangeTimestamp: new Date('2024-03-01T09:00:32Z'),
    userQuantity: 0.5,
    exchangeQuantity: 0.5,
    timeDeltaSeconds: 32,
    quantityDeltaPct: 0,
    confidenceScore: 95,
    matchMethod: 'tolerance',
    conflictReasons: [],
    notes: 'Matched within tolerance',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IReconciliationResult;
}

describe('resultsToCsv', () => {
  it('generates CSV with header row', () => {
    const results = [makeResult(ReconciliationStatus.MATCHED)];
    const csv = resultsToCsv(results);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('status');
    expect(lines[0]).toContain('user_transaction_id');
    expect(lines[0]).toContain('exchange_transaction_id');
  });

  it('includes data rows', () => {
    const results = [makeResult(ReconciliationStatus.MATCHED)];
    const csv = resultsToCsv(results);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2); // header + 1 data row
    expect(lines[1]).toContain('MATCHED');
    expect(lines[1]).toContain('USR-001');
  });

  it('returns only header for empty results', () => {
    const csv = resultsToCsv([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
  });

  it('escapes commas in notes field', () => {
    const result = makeResult(ReconciliationStatus.CONFLICTING, {
      notes: 'Conflict, reason: timestamp',
    });
    const csv = resultsToCsv([result]);
    expect(csv).toContain('"Conflict, reason: timestamp"');
  });
});

describe('groupResultsByStatus', () => {
  it('groups results by status correctly', () => {
    const results = [
      makeResult(ReconciliationStatus.MATCHED),
      makeResult(ReconciliationStatus.MATCHED),
      makeResult(ReconciliationStatus.CONFLICTING),
      makeResult(ReconciliationStatus.UNMATCHED_USER),
      makeResult(ReconciliationStatus.UNMATCHED_EXCHANGE),
    ];

    const grouped = groupResultsByStatus(results);
    expect(grouped[ReconciliationStatus.MATCHED]).toHaveLength(2);
    expect(grouped[ReconciliationStatus.CONFLICTING]).toHaveLength(1);
    expect(grouped[ReconciliationStatus.UNMATCHED_USER]).toHaveLength(1);
    expect(grouped[ReconciliationStatus.UNMATCHED_EXCHANGE]).toHaveLength(1);
  });
});

describe('buildSummary', () => {
  it('builds a summary from a run document', () => {
    const run = {
      runId: 'run-123',
      status: RunStatus.COMPLETED,
      startedAt: new Date(),
      completedAt: new Date(),
      durationMs: 1500,
      config: { timestampToleranceSeconds: 300, quantityTolerancePct: 0.01 },
      totalUser: 20,
      totalExchange: 23,
      matched: 18,
      conflicting: 1,
      unmatchedUser: 1,
      unmatchedExchange: 4,
      rejectedUser: 3,
      rejectedExchange: 0,
      matchRate: 90,
    } as IReconciliationRun;

    const summary = buildSummary(run);
    expect(summary.runId).toBe('run-123');
    expect(summary.counts.matched).toBe(18);
    expect(summary.matchRate).toBe(90);
    expect(summary.config.timestampToleranceSeconds).toBe(300);
  });
});
