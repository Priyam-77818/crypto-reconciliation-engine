import { ReconciliationRun, IReconciliationRun } from '../models/ReconciliationRun';
import { RunStatus } from '../types';

export class ReconciliationRunRepository {
  async create(
    data: Partial<IReconciliationRun>,
  ): Promise<IReconciliationRun> {
    const run = new ReconciliationRun(data);
    return run.save();
  }

  async findByRunId(runId: string): Promise<IReconciliationRun | null> {
    return ReconciliationRun.findOne({ runId }).lean().exec() as unknown as IReconciliationRun | null;
  }

  async updateStatus(
    runId: string,
    status: RunStatus,
    updates?: Partial<IReconciliationRun>,
  ): Promise<IReconciliationRun | null> {
    return ReconciliationRun.findOneAndUpdate(
      { runId },
      { $set: { status, ...updates } },
      { new: true },
    )
      .lean()
      .exec() as unknown as IReconciliationRun | null;
  }

  async findAll(limit = 20, skip = 0): Promise<IReconciliationRun[]> {
    return ReconciliationRun.find()
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as IReconciliationRun[];
  }

  async count(): Promise<number> {
    return ReconciliationRun.countDocuments();
  }
}
