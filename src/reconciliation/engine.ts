import { v4 as uuidv4 } from 'uuid';
import { NormalizedTransactionRepository } from '../repositories/normalizedTransaction.repository';
import { ReconciliationRunRepository } from '../repositories/reconciliationRun.repository';
import { ReconciliationResultRepository } from '../repositories/reconciliationResult.repository';
import { RejectedRowRepository } from '../repositories/rejectedRow.repository';
import { matchTransaction } from './matcher';
import {
  TransactionSource,
  NormalizedAsset,
  NormalizedTransactionType,
  ReconciliationStatus,
  ReconciliationConfig,
  RunStatus,
} from '../types';
import { TRANSFER_COUNTERPART_MAP } from '../config/normalization';
import { logger } from '../utils/logger';
import { INormalizedTransaction } from '../models/NormalizedTransaction';

export interface ReconciliationEngineResult {
  runId: string;
  status: RunStatus;
  summary: {
    totalUser: number;
    totalExchange: number;
    matched: number;
    conflicting: number;
    unmatchedUser: number;
    unmatchedExchange: number;
    rejectedUser: number;
    rejectedExchange: number;
    matchRate: number;
    durationMs: number;
  };
}

export class ReconciliationEngine {
  private normalizedRepo = new NormalizedTransactionRepository();
  private runRepo = new ReconciliationRunRepository();
  private resultRepo = new ReconciliationResultRepository();
  private rejectedRepo = new RejectedRowRepository();

  /**
   * Executes a full reconciliation run.
   *
   * Algorithm:
   * 1. Load all normalized user and exchange transactions
   * 2. Group both sets by (asset, normalizedType) — where user TRANSFER_OUT
   *    is grouped against exchange TRANSFER_IN
   * 3. For each user transaction, run priority-based matching against
   *    the corresponding exchange group
   * 4. Track used exchange IDs to prevent duplicate pairing
   * 5. Any exchange transactions not matched are marked UNMATCHED_EXCHANGE
   * 6. Persist all results and update the run record
   */
  async run(config: ReconciliationConfig): Promise<ReconciliationEngineResult> {
    const runId = uuidv4();
    const startedAt = new Date();

    logger.info({ runId, config }, 'Starting reconciliation run');

    // Create run record
    await this.runRepo.create({
      runId,
      status: RunStatus.RUNNING,
      config,
      startedAt,
      completedAt: null,
      durationMs: null,
      totalUser: 0,
      totalExchange: 0,
      matched: 0,
      conflicting: 0,
      unmatchedUser: 0,
      unmatchedExchange: 0,
      rejectedUser: 0,
      rejectedExchange: 0,
      matchRate: 0,
      errorMessage: null,
    });

    try {
      // Load all normalized transactions
      const [userTxs, exchangeTxs] = await Promise.all([
        this.normalizedRepo.findBySource(TransactionSource.USER),
        this.normalizedRepo.findBySource(TransactionSource.EXCHANGE),
      ]);

      const [rejectedUser, rejectedExchange] = await Promise.all([
        this.rejectedRepo.countBySource(TransactionSource.USER),
        this.rejectedRepo.countBySource(TransactionSource.EXCHANGE),
      ]);

      logger.info(
        { runId, userCount: userTxs.length, exchangeCount: exchangeTxs.length },
        'Loaded transactions for reconciliation',
      );

      // Build exchange lookup: groupKey → transactions[]
      // groupKey = `${asset}::${normalizedType}`
      // For exchange TRANSFER_IN, we also index under TRANSFER_OUT so user TRANSFER_OUT matches
      const exchangeGroups = new Map<string, INormalizedTransaction[]>();

      for (const tx of exchangeTxs) {
        // Primary key
        const primaryKey = `${tx.asset}::${tx.type}`;
        if (!exchangeGroups.has(primaryKey)) exchangeGroups.set(primaryKey, []);
        exchangeGroups.get(primaryKey)!.push(tx);

        // Also index under counterpart type for cross-source transfer matching
        const counterpart = TRANSFER_COUNTERPART_MAP[tx.type];
        if (counterpart) {
          const counterKey = `${tx.asset}::${counterpart}`;
          if (!exchangeGroups.has(counterKey)) exchangeGroups.set(counterKey, []);
          exchangeGroups.get(counterKey)!.push(tx);
        }
      }

      // Track which exchange transactions have been matched
      const usedExchangeIds = new Set<string>();
      const results: Parameters<typeof this.resultRepo.bulkInsert>[0] = [];

      let matched = 0;
      let conflicting = 0;
      let unmatchedUser = 0;

      // Match each user transaction
      for (const userTx of userTxs) {
        const groupKey = `${userTx.asset}::${userTx.type}`;
        const candidates = exchangeGroups.get(groupKey) ?? [];

        const matchResult = matchTransaction(userTx, candidates, usedExchangeIds, config);

        if (matchResult.candidate) {
          usedExchangeIds.add(matchResult.candidate.exchangeTxId);
        }

        switch (matchResult.status) {
          case ReconciliationStatus.MATCHED:
            matched++;
            break;
          case ReconciliationStatus.CONFLICTING:
            conflicting++;
            break;
          case ReconciliationStatus.UNMATCHED_USER:
            unmatchedUser++;
            break;
        }

        results.push({
          runId,
          status: matchResult.status,
          userTransactionId: userTx.transactionId,
          exchangeTransactionId: matchResult.exchangeTx?.transactionId ?? null,
          asset: userTx.asset,
          type: userTx.type,
          userTimestamp: userTx.timestamp,
          exchangeTimestamp: matchResult.exchangeTx?.timestamp ?? null,
          userQuantity: userTx.quantity,
          exchangeQuantity: matchResult.exchangeTx?.quantity ?? null,
          timeDeltaSeconds: matchResult.candidate?.timeDeltaSeconds ?? null,
          quantityDeltaPct: matchResult.candidate?.quantityDeltaPct ?? null,
          confidenceScore: matchResult.candidate?.confidenceScore ?? null,
          matchMethod: matchResult.candidate?.matchMethod ?? null,
          conflictReasons: matchResult.conflictReasons,
          notes: matchResult.notes,
        });
      }

      // Find unmatched exchange transactions
      const unmatchedExchangeTxs = exchangeTxs.filter(
        (tx) => !usedExchangeIds.has(tx.transactionId),
      );
      const unmatchedExchange = unmatchedExchangeTxs.length;

      for (const exTx of unmatchedExchangeTxs) {
        results.push({
          runId,
          status: ReconciliationStatus.UNMATCHED_EXCHANGE,
          userTransactionId: null,
          exchangeTransactionId: exTx.transactionId,
          asset: exTx.asset,
          type: exTx.type,
          userTimestamp: null,
          exchangeTimestamp: exTx.timestamp,
          userQuantity: null,
          exchangeQuantity: exTx.quantity,
          timeDeltaSeconds: null,
          quantityDeltaPct: null,
          confidenceScore: null,
          matchMethod: null,
          conflictReasons: [],
          notes: 'No matching user transaction found',
        });
      }

      // Persist results
      await this.resultRepo.bulkInsert(results);

      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const totalUser = userTxs.length;
      const totalExchange = exchangeTxs.length;
      const matchRate =
        totalUser > 0 ? parseFloat(((matched / totalUser) * 100).toFixed(2)) : 0;

      // Update run record
      await this.runRepo.updateStatus(runId, RunStatus.COMPLETED, {
        completedAt,
        durationMs,
        totalUser,
        totalExchange,
        matched,
        conflicting,
        unmatchedUser,
        unmatchedExchange,
        rejectedUser,
        rejectedExchange,
        matchRate,
      } as Parameters<typeof this.runRepo.updateStatus>[2]);

      logger.info(
        { runId, matched, conflicting, unmatchedUser, unmatchedExchange, durationMs },
        'Reconciliation run completed',
      );

      return {
        runId,
        status: RunStatus.COMPLETED,
        summary: {
          totalUser,
          totalExchange,
          matched,
          conflicting,
          unmatchedUser,
          unmatchedExchange,
          rejectedUser,
          rejectedExchange,
          matchRate,
          durationMs,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ runId, error: errorMessage }, 'Reconciliation run failed');

      await this.runRepo.updateStatus(runId, RunStatus.FAILED, {
        completedAt: new Date(),
        errorMessage,
      } as Parameters<typeof this.runRepo.updateStatus>[2]);

      throw error;
    }
  }
}
