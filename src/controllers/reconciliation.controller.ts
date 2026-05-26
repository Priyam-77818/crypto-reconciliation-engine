import { Request, Response } from 'express';
import { ReconciliationService } from '../services/reconciliation.service';
import { ReconciliationConfigSchema } from '../validators/transaction.validator';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const reconciliationService = new ReconciliationService();

/**
 * POST /reconcile
 * Triggers a new reconciliation run.
 */
export async function triggerReconciliation(req: Request, res: Response): Promise<void> {
  const parsed = ReconciliationConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ValidationError('Invalid reconciliation config', parsed.error.flatten());
  }

  logger.info({ body: req.body }, 'Reconciliation triggered via API');

  const result = await reconciliationService.triggerRun(parsed.data);

  res.status(202).json({
    success: true,
    message: 'Reconciliation run completed',
    data: result,
  });
}

/**
 * GET /report/:runId
 * Returns the full reconciliation report.
 */
export async function getFullReport(req: Request, res: Response): Promise<void> {
  const { runId } = req.params;
  const format = req.query.format as string | undefined;

  if (format === 'csv') {
    const csv = await reconciliationService.getReportCsv(runId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${runId}.csv"`);
    res.status(200).send(csv);
    return;
  }

  const report = await reconciliationService.getFullReport(runId);
  res.status(200).json({ success: true, data: report });
}

/**
 * GET /report/:runId/summary
 * Returns only the summary statistics for a run.
 */
export async function getReportSummary(req: Request, res: Response): Promise<void> {
  const { runId } = req.params;
  const summary = await reconciliationService.getSummary(runId);
  res.status(200).json({ success: true, data: summary });
}

/**
 * GET /report/:runId/unmatched
 * Returns unmatched transactions for a run.
 */
export async function getUnmatched(req: Request, res: Response): Promise<void> {
  const { runId } = req.params;
  const limit = parseInt((req.query.limit as string) ?? '100', 10);
  const skip = parseInt((req.query.skip as string) ?? '0', 10);

  const unmatched = await reconciliationService.getUnmatched(runId, { limit, skip });
  res.status(200).json({ success: true, data: unmatched });
}

/**
 * GET /runs
 * Returns paginated list of all reconciliation runs.
 */
export async function listRuns(req: Request, res: Response): Promise<void> {
  const limit = parseInt((req.query.limit as string) ?? '20', 10);
  const skip = parseInt((req.query.skip as string) ?? '0', 10);

  const result = await reconciliationService.listRuns(limit, skip);
  res.status(200).json({
    success: true,
    data: result.runs,
    pagination: {
      total: result.total,
      limit,
      skip,
      hasMore: skip + limit < result.total,
    },
  });
}
