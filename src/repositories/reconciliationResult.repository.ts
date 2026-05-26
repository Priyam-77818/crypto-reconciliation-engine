import { ReconciliationResult, IReconciliationResult } from '../models/ReconciliationResult';
import { ReconciliationStatus } from '../types';

export class ReconciliationResultRepository {
  async bulkInsert(docs: Partial<IReconciliationResult>[]): Promise<number> {
    if (docs.length === 0) return 0;
    const result = await ReconciliationResult.insertMany(docs, { ordered: false });
    return result.length;
  }

  async findByRunId(
    runId: string,
    options: { limit?: number; skip?: number; status?: ReconciliationStatus } = {},
  ): Promise<IReconciliationResult[]> {
    const filter: Record<string, unknown> = { runId };
    if (options.status) filter.status = options.status;

    return ReconciliationResult.find(filter)
      .sort({ createdAt: 1 })
      .skip(options.skip ?? 0)
      .limit(options.limit ?? 1000)
      .lean()
      .exec() as unknown as IReconciliationResult[];
  }

  async countByRunIdAndStatus(
    runId: string,
    status: ReconciliationStatus,
  ): Promise<number> {
    return ReconciliationResult.countDocuments({ runId, status });
  }

  async countByRunId(runId: string): Promise<number> {
    return ReconciliationResult.countDocuments({ runId });
  }

  async deleteByRunId(runId: string): Promise<void> {
    await ReconciliationResult.deleteMany({ runId });
  }
}
