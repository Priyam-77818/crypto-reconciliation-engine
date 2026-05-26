import { INormalizedTransaction } from '../models/NormalizedTransaction';
import {
  ReconciliationConfig,
  ReconciliationStatus,
  ConflictReason,
  MatchCandidate,
  NormalizedTransactionType,
} from '../types';
import { TRANSFER_COUNTERPART_MAP } from '../config/normalization';
import { timeDeltaSeconds, quantityDeltaPct } from '../utils/normalizer';

export interface MatchResult {
  userTx: INormalizedTransaction;
  exchangeTx: INormalizedTransaction | null;
  status: ReconciliationStatus;
  candidate: MatchCandidate | null;
  conflictReasons: ConflictReason[];
  notes: string;
}

/**
 * Determines if two transaction types are compatible for matching.
 * BUY↔BUY, SELL↔SELL, TRANSFER_OUT↔TRANSFER_IN (cross-source).
 */
function typesAreCompatible(
  userType: NormalizedTransactionType,
  exchangeType: NormalizedTransactionType,
): boolean {
  if (userType === exchangeType) return true;
  // Allow TRANSFER_OUT (user) ↔ TRANSFER_IN (exchange)
  return TRANSFER_COUNTERPART_MAP[userType] === exchangeType;
}

/**
 * Calculates a confidence score (0–100) for a potential match.
 * Higher score = better match.
 */
function calculateConfidence(
  timeDelta: number,
  qtyDelta: number,
  config: ReconciliationConfig,
  matchMethod: MatchCandidate['matchMethod'],
): number {
  const timeScore = Math.max(0, 100 - (timeDelta / config.timestampToleranceSeconds) * 50);
  const qtyScore = Math.max(0, 100 - (qtyDelta / config.quantityTolerancePct) * 50);

  const methodBonus: Record<MatchCandidate['matchMethod'], number> = {
    exact_id: 100,
    exact_fields: 20,
    tolerance: 10,
    fuzzy_timestamp: 0,
  };

  const base = (timeScore + qtyScore) / 2;
  return Math.min(100, base + methodBonus[matchMethod]);
}

/**
 * Core matching function: attempts to find the best exchange transaction
 * for a given user transaction, using a priority-based strategy.
 *
 * Priority:
 * 1. Exact ID match (same transaction_id across sources)
 * 2. Exact field match (same asset, type, quantity, timestamp)
 * 3. Tolerance-based match (within configured windows)
 * 4. Fuzzy timestamp proximity (closest timestamp, may be CONFLICTING)
 */
export function matchTransaction(
  userTx: INormalizedTransaction,
  candidates: INormalizedTransaction[],
  usedExchangeIds: Set<string>,
  config: ReconciliationConfig,
): MatchResult {
  const available = candidates.filter((c) => !usedExchangeIds.has(c.transactionId));

  if (available.length === 0) {
    return {
      userTx,
      exchangeTx: null,
      status: ReconciliationStatus.UNMATCHED_USER,
      candidate: null,
      conflictReasons: [ConflictReason.MISSING_TRANSACTION],
      notes: 'No exchange candidates available for this asset/type group',
    };
  }

  // --- Priority 1: Exact ID match ---
  const exactIdMatch = available.find((c) => c.transactionId === userTx.transactionId);
  if (exactIdMatch) {
    const timeDelta = timeDeltaSeconds(userTx.timestamp, exactIdMatch.timestamp);
    const qtyDelta = quantityDeltaPct(userTx.quantity, exactIdMatch.quantity);
    const candidate: MatchCandidate = {
      exchangeTxId: exactIdMatch.transactionId,
      confidenceScore: 100,
      matchMethod: 'exact_id',
      timeDeltaSeconds: timeDelta,
      quantityDeltaPct: qtyDelta,
      conflicts: [],
    };
    return {
      userTx,
      exchangeTx: exactIdMatch,
      status: ReconciliationStatus.MATCHED,
      candidate,
      conflictReasons: [],
      notes: 'Matched by exact transaction ID',
    };
  }

  // --- Priority 2 & 3: Score all candidates ---
  type ScoredCandidate = {
    tx: INormalizedTransaction;
    timeDelta: number;
    qtyDelta: number;
    withinTimeTolerance: boolean;
    withinQtyTolerance: boolean;
    typeCompatible: boolean;
  };

  const scored: ScoredCandidate[] = available.map((c) => {
    const timeDelta = timeDeltaSeconds(userTx.timestamp, c.timestamp);
    const qtyDelta = quantityDeltaPct(userTx.quantity, c.quantity);
    return {
      tx: c,
      timeDelta,
      qtyDelta,
      withinTimeTolerance: timeDelta <= config.timestampToleranceSeconds,
      withinQtyTolerance: qtyDelta <= config.quantityTolerancePct,
      typeCompatible: typesAreCompatible(userTx.type, c.type),
    };
  });

  // Exact field match: same quantity (within float precision), same timestamp (within 1s), compatible type
  const exactFieldMatch = scored.find(
    (s) => s.typeCompatible && s.timeDelta <= 1 && s.qtyDelta < 0.0001,
  );
  if (exactFieldMatch) {
    const candidate: MatchCandidate = {
      exchangeTxId: exactFieldMatch.tx.transactionId,
      confidenceScore: calculateConfidence(
        exactFieldMatch.timeDelta,
        exactFieldMatch.qtyDelta,
        config,
        'exact_fields',
      ),
      matchMethod: 'exact_fields',
      timeDeltaSeconds: exactFieldMatch.timeDelta,
      quantityDeltaPct: exactFieldMatch.qtyDelta,
      conflicts: [],
    };
    return {
      userTx,
      exchangeTx: exactFieldMatch.tx,
      status: ReconciliationStatus.MATCHED,
      candidate,
      conflictReasons: [],
      notes: 'Matched by exact field values',
    };
  }

  // Tolerance-based match: within configured windows
  const toleranceMatches = scored.filter(
    (s) => s.typeCompatible && s.withinTimeTolerance && s.withinQtyTolerance,
  );

  if (toleranceMatches.length > 0) {
    // Pick the closest by time delta, then quantity delta
    toleranceMatches.sort((a, b) => a.timeDelta - b.timeDelta || a.qtyDelta - b.qtyDelta);
    const best = toleranceMatches[0];
    const candidate: MatchCandidate = {
      exchangeTxId: best.tx.transactionId,
      confidenceScore: calculateConfidence(
        best.timeDelta,
        best.qtyDelta,
        config,
        'tolerance',
      ),
      matchMethod: 'tolerance',
      timeDeltaSeconds: best.timeDelta,
      quantityDeltaPct: best.qtyDelta,
      conflicts: [],
    };
    return {
      userTx,
      exchangeTx: best.tx,
      status: ReconciliationStatus.MATCHED,
      candidate,
      conflictReasons: [],
      notes: `Matched within tolerance (Δt=${best.timeDelta.toFixed(1)}s, Δqty=${best.qtyDelta.toFixed(4)}%)`,
    };
  }

  // --- Priority 4: Fuzzy timestamp proximity — may be CONFLICTING ---
  // Find the closest candidate regardless of tolerance
  const compatibleTyped = scored.filter((s) => s.typeCompatible);
  if (compatibleTyped.length > 0) {
    compatibleTyped.sort((a, b) => a.timeDelta - b.timeDelta);
    const closest = compatibleTyped[0];
    const conflicts: ConflictReason[] = [];

    if (!closest.withinTimeTolerance) conflicts.push(ConflictReason.TIMESTAMP_OUT_OF_RANGE);
    if (!closest.withinQtyTolerance) conflicts.push(ConflictReason.QUANTITY_MISMATCH);

    const candidate: MatchCandidate = {
      exchangeTxId: closest.tx.transactionId,
      confidenceScore: calculateConfidence(
        closest.timeDelta,
        closest.qtyDelta,
        config,
        'fuzzy_timestamp',
      ),
      matchMethod: 'fuzzy_timestamp',
      timeDeltaSeconds: closest.timeDelta,
      quantityDeltaPct: closest.qtyDelta,
      conflicts,
    };

    return {
      userTx,
      exchangeTx: closest.tx,
      status: ReconciliationStatus.CONFLICTING,
      candidate,
      conflictReasons: conflicts,
      notes: `Closest candidate found but exceeds tolerance: ${conflicts.join(', ')}`,
    };
  }

  // No compatible type found at all
  return {
    userTx,
    exchangeTx: null,
    status: ReconciliationStatus.UNMATCHED_USER,
    candidate: null,
    conflictReasons: [ConflictReason.MISSING_TRANSACTION],
    notes: 'No compatible exchange transaction found',
  };
}
