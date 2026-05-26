import { IReconciliationResult } from '../models/ReconciliationResult';
import { IReconciliationRun } from '../models/ReconciliationRun';
import { ReconciliationStatus } from '../types';

export interface ReportSummary {
  runId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number | null;
  config: {
    timestampToleranceSeconds: number;
    quantityTolerancePct: number;
  };
  counts: {
    totalUser: number;
    totalExchange: number;
    matched: number;
    conflicting: number;
    unmatchedUser: number;
    unmatchedExchange: number;
    rejectedUser: number;
    rejectedExchange: number;
  };
  matchRate: number;
}

export interface FullReport {
  summary: ReportSummary;
  results: IReconciliationResult[];
}

/**
 * Builds a structured summary from a reconciliation run document.
 */
export function buildSummary(run: IReconciliationRun): ReportSummary {
  return {
    runId: run.runId,
    status: run.status,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: run.durationMs,
    config: {
      timestampToleranceSeconds: run.config.timestampToleranceSeconds,
      quantityTolerancePct: run.config.quantityTolerancePct,
    },
    counts: {
      totalUser: run.totalUser,
      totalExchange: run.totalExchange,
      matched: run.matched,
      conflicting: run.conflicting,
      unmatchedUser: run.unmatchedUser,
      unmatchedExchange: run.unmatchedExchange,
      rejectedUser: run.rejectedUser,
      rejectedExchange: run.rejectedExchange,
    },
    matchRate: run.matchRate,
  };
}

/**
 * Converts reconciliation results to CSV format.
 */
export function resultsToCsv(results: IReconciliationResult[]): string {
  const headers = [
    'status',
    'user_transaction_id',
    'exchange_transaction_id',
    'asset',
    'type',
    'user_timestamp',
    'exchange_timestamp',
    'user_quantity',
    'exchange_quantity',
    'time_delta_seconds',
    'quantity_delta_pct',
    'confidence_score',
    'match_method',
    'conflict_reasons',
    'notes',
  ];

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = results.map((r) =>
    [
      r.status,
      r.userTransactionId ?? '',
      r.exchangeTransactionId ?? '',
      r.asset,
      r.type,
      r.userTimestamp?.toISOString() ?? '',
      r.exchangeTimestamp?.toISOString() ?? '',
      r.userQuantity ?? '',
      r.exchangeQuantity ?? '',
      r.timeDeltaSeconds ?? '',
      r.quantityDeltaPct?.toFixed(6) ?? '',
      r.confidenceScore?.toFixed(2) ?? '',
      r.matchMethod ?? '',
      r.conflictReasons.join('|'),
      r.notes,
    ]
      .map(escape)
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Groups results by status for quick access.
 */
export function groupResultsByStatus(
  results: IReconciliationResult[],
): Record<ReconciliationStatus, IReconciliationResult[]> {
  const grouped: Record<ReconciliationStatus, IReconciliationResult[]> = {
    [ReconciliationStatus.MATCHED]: [],
    [ReconciliationStatus.CONFLICTING]: [],
    [ReconciliationStatus.UNMATCHED_USER]: [],
    [ReconciliationStatus.UNMATCHED_EXCHANGE]: [],
  };

  for (const result of results) {
    grouped[result.status as ReconciliationStatus]?.push(result);
  }

  return grouped;
}
