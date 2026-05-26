import { RejectedRow, IRejectedRow } from '../models/RejectedRow';
import { TransactionSource } from '../types';

export class RejectedRowRepository {
  async bulkInsert(docs: Partial<IRejectedRow>[]): Promise<number> {
    if (docs.length === 0) return 0;
    const result = await RejectedRow.insertMany(docs, { ordered: false });
    return result.length;
  }

  async findBySource(
    source: TransactionSource,
    limit = 100,
    skip = 0,
  ): Promise<IRejectedRow[]> {
    return RejectedRow.find({ source })
      .sort({ rowIndex: 1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec() as unknown as IRejectedRow[];
  }

  async countBySource(source: TransactionSource): Promise<number> {
    return RejectedRow.countDocuments({ source });
  }

  async deleteAll(): Promise<void> {
    await RejectedRow.deleteMany({});
  }
}
