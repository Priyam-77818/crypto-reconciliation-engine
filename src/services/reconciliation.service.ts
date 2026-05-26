import { ReconciliationEngine } from '../reconciliation/engine';
import { ReconciliationRunRepository } from '../repositories/reconciliationRun.repository';
import { ReconciliationResultRepository } from '../repositories/reconciliationResult.repository';
import { ReconciliationConfig, ReconciliationStatus } from '../types';
import { config as appConfig } from '../config';
import { buildSummary, resultsToCsv, FullReport } from '../reports/reportGenerator';
import { NotFoundError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ReconciliationService {
  private engine = new ReconciliationEngine();
  private runRepo = new ReconciliationRunRepository();
  private resultRepo = new ReconciliationResultRepository();

  /**
   * Triggers a new reconciliation run with optional config overrides.
   */
  async triggerRun(
    configOverrides?: Partial<ReconciliationConfig>,
  ): Promise<ReturnType<ReconciliationEngine['run']>> {
    const runConfig: ReconciliationConfig = {
      timestampToleranceSeconds:
        configOverrides?.timestampToleranceSeconds ??
        appConfig.reconciliation.timestampToleranceSeconds,
      quantityTolerancePct:
        configOverrides?.quantityTolerancePct ??
        appConfig.reconciliation.quantityTolerancePct,
    };

    logger.info({ runConfig }, 'Triggering reconciliation run');
    return this.engine.run(runConfig);
  }

  /**
   * Returns the full report for a given run ID.
   */
  async getFullReport(runId: string): Promise<FullReport> {
    const run = await this.runRepo.findByRunId(runId);
    if (!run) throw new NotFoundError('ReconciliationRun', runId);

    const results = await this.resultRepo.findByRunId(runId, { limit: 10000 });
    return {
      summary: buildSummary(run),
      results,
    };
  }

  /**
   * Returns only the summary for a given run ID.
   */
  async getSummary(runId: string): Promise<ReturnType<typeof buildSummary>> {
    const run = await this.runRepo.findByRunId(runId);
    if (!run) throw new NotFoundError('ReconciliationRun', runId);
    return buildSummary(run);
  }

  /**
   * Returns unmatched transactions for a given run ID.
   */
  async getUnmatched(
    runId: string,
    options: { limit?: number; skip?: number } = {},
  ): Promise<{
    unmatchedUser: Awaited<ReturnType<ReconciliationResultRepository['findByRunId']>>;
    unmatchedExchange: Awaited<ReturnType<ReconciliationResultRepository['findByRunId']>>;
  }> {
    const run = await this.runRepo.findByRunId(runId);
    if (!run) throw new NotFoundError('ReconciliationRun', runId);

    const [unmatchedUser, unmatchedExchange] = await Promise.all([
      this.resultRepo.findByRunId(runId, {
        status: ReconciliationStatus.UNMATCHED_USER,
        ...options,
      }),
      this.resultRepo.findByRunId(runId, {
        status: ReconciliationStatus.UNMATCHED_EXCHANGE,
        ...options,
      }),
    ]);

    return { unmatchedUser, unmatchedExchange };
  }

  /**
   * Returns the CSV export of a full report.
   */
  async getReportCsv(runId: string): Promise<string> {
    const { results } = await this.getFullReport(runId);
    return resultsToCsv(results);
  }

  /**
   * Returns paginated list of all runs.
   */
  async listRuns(
    limit = 20,
    skip = 0,
  ): Promise<{
    runs: Awaited<ReturnType<ReconciliationRunRepository['findAll']>>;
    total: number;
  }> {
    const [runs, total] = await Promise.all([
      this.runRepo.findAll(limit, skip),
      this.runRepo.count(),
    ]);
    return { runs, total };
  }
}
